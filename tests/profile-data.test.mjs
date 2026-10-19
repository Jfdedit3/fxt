import test from "node:test";
import assert from "node:assert/strict";
import { profileAvatarUrl, profilePath } from "../app/post-info.mjs";
import { getProfile, getTimeline, profileOptions, profilePageUrl, timelinePosts, timelineUrl } from "../app/profile-data.mjs";

const post = (id, handle = "alice") => ({ type: "status", id, author: { screen_name: handle }, text: "Post" });

test("profile photos use a larger supported Twitter image size", () => {
  assert.equal(profileAvatarUrl("https://pbs.twimg.com/profile_images/123/photo_normal.jpg"), "https://pbs.twimg.com/profile_images/123/photo_400x400.jpg");
  assert.equal(profileAvatarUrl("https://example.com/photo_normal.jpg"), "https://example.com/photo_normal.jpg");
  assert.equal(profileAvatarUrl("javascript:alert(1)"), null);
});

test("profile routes reject unsafe names and preserve safe pagination", () => {
  assert.equal(profilePath("alice_1"), "/alice_1");
  for (const handle of ["//evil.test", "../api", "alice?tab=media", "@alice", "", null]) assert.equal(profilePath(handle), null);
  assert.deepEqual(profileOptions({ tab: ["media"], cursor: "bad cursor" }), { tab: "posts", cursor: null });
  const cursor = "abc+def/ghi=";
  const url = new URL(timelineUrl("alice", { tab: "replies", cursor }));
  assert.equal(url.pathname, "/2/profile/alice/statuses");
  assert.equal(url.searchParams.get("cursor"), cursor);
  assert.equal(url.searchParams.get("with_replies"), "true");
  assert.equal(new URL(timelineUrl("alice", { tab: "media" })).pathname, "/2/profile/alice/media");
  assert.equal(profilePageUrl("alice", { tab: "media", cursor }), "/alice?tab=media&cursor=abc%2Bdef%2Fghi%3D");
  assert.equal(profilePageUrl("alice", { tab: "posts" }), "/alice");
  assert.equal(timelineUrl("../evil"), null);
});

test("profile fetch distinguishes not found, outage and malformed accounts", async () => {
  let called = false;
  const invalid = await getProfile("../evil", async () => { called = true; });
  assert.equal(invalid.state, "not-found"); assert.equal(called, false);
  const profile = await getProfile("Alice", async (url, options) => {
    assert.equal(url, "https://api.fxtwitter.com/2/profile/Alice");
    assert.ok(options.signal); assert.equal(options.next.revalidate, 60);
    return Response.json({ code: 200, user: { screen_name: "alice", name: "Alice" } });
  });
  assert.equal(profile.state, "ready");
  assert.equal((await getProfile("alice", async () => new Response(null, { status: 404 }))).state, "not-found");
  assert.equal((await getProfile("alice", async () => { throw Error("timeout"); })).state, "unavailable");
  assert.equal((await getProfile("alice", async () => Response.json({ user: { screen_name: "someone_else" } }))).state, "unavailable");
});

test("timelines flatten threads, deduplicate and keep repost authors intact", () => {
  const posts = timelinePosts({ results: [post("1"), { type: "thread", statuses: [post("1"), post("2", "bob")] }, { type: "tombstone", id: "3" }, { id: "bad", author: { screen_name: "alice" } }] });
  assert.deepEqual(posts.map(p => p.id), ["1", "2"]);
  assert.equal(posts[1].author.screen_name, "bob");
});

test("timeline pagination stops on repeated cursors and distinguishes empty from failure", async () => {
  const ready = await getTimeline("alice", {}, async () => Response.json({ code: 200, results: [post("1")], cursor: { bottom: "next==" } }));
  assert.equal(ready.state, "ready"); assert.equal(ready.nextCursor, "next==");
  const same = await getTimeline("alice", { cursor: "next==" }, async () => Response.json({ results: [post("1")], cursor: { bottom: "next==" } }));
  assert.equal(same.nextCursor, null);
  assert.equal((await getTimeline("alice", {}, async () => new Response(null, { status: 404 }))).state, "empty");
  assert.equal((await getTimeline("alice", {}, async () => new Response(null, { status: 500 }))).state, "unavailable");
  assert.equal((await getTimeline("alice", {}, async () => Response.json({ error: "upstream error" }))).state, "unavailable");
  assert.equal((await getTimeline("alice", {}, async () => new Response(null, { status: 204 }))).state, "empty");
});
