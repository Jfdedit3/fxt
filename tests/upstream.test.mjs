import test from "node:test";
import assert from "node:assert/strict";
import { getProfile, getTimeline } from "../app/profile-data.mjs";
import { getPostResult } from "../app/post-data.mjs";
import { fetchApi } from "../app/upstream.mjs";

const author = { id: "123456", screen_name: "HoldingNuts_3D", name: "HoldingNuts", followers: 100 };
const post = { id: "2111273616495333805", author, text: "Regression fixture", media: { all: [] } };

test("HoldingNuts_3D survives false 404 responses from both profile endpoints", async () => {
  const result = await getProfile("HoldingNuts_3D", async url => url.includes("/statuses") ? Response.json({ code: 200, results: [post, post] }) : new Response(null, { status: 404 }));
  assert.equal(result.state, "ready");
  assert.equal(result.user.screen_name, "HoldingNuts_3D");
});

test("a broken v2 lookup falls back to the legacy profile endpoint", async () => {
  const result = await getProfile("HoldingNuts_3D", async url => url.includes("/2/") ? Response.json({ code: 404 }) : Response.json({ code: 200, user: author }));
  assert.equal(result.state, "ready");
});

test("temporary profile failures are not misreported as a deleted account", async () => {
  const result = await getProfile("HoldingNuts_3D", async url => url.includes("/statuses") ? new Response(null, { status: 503 }) : new Response(null, { status: 404 }));
  assert.equal(result.state, "unavailable");
  const absent = await getProfile("MissingUser", async () => new Response(null, { status: 404 }));
  assert.equal(absent.state, "not-found");
});

test("transient errors are retried and timeline lookup can use the stable user ID", async () => {
  let calls = 0;
  const response = await fetchApi("https://api.fxtwitter.com/test", async () => ++calls === 1 ? new Response(null, { status: 503 }) : Response.json({ code: 200 }));
  assert.equal(response.state, "ready"); assert.equal(calls, 2);
  const timeline = await getTimeline("HoldingNuts_3D", { userId: author.id }, async url => url.includes("id:123456") ? Response.json({ results: [post], cursor: {} }) : new Response(null, { status: 404 }));
  assert.equal(timeline.state, "ready");
});

test("malformed posts, API error objects and unrelated IDs are rejected", async () => {
  for (const value of [{ error: "unavailable" }, { ...post, id: "999" }, { ...post, author: null }]) {
    const result = await getPostResult("HoldingNuts_3D", post.id, async () => Response.json({ status: value }));
    assert.equal(result.state, "unavailable"); assert.equal(result.post, null);
  }
  const missing = await getPostResult("HoldingNuts_3D", post.id, async () => new Response(null, { status: 404 }));
  assert.equal(missing.state, "not-found");
  const invalid = await getPostResult("NASA", "1", async () => new Response(null, { status: 400 }));
  assert.equal(invalid.state, "not-found");
  const valid = await getPostResult("i", post.id, async () => Response.json({ status: post }));
  assert.equal(valid.post.author.screen_name, author.screen_name);
});

test("avatar links can recover a profile directly by its public numeric ID", async () => {
  const result = await getProfile("HoldingNuts_3D", async url => url.endsWith("/id:123456") ? Response.json({ user: author }) : new Response(null, { status: 404 }), "123456");
  assert.equal(result.state, "ready");
  assert.equal(result.user.id, "123456");
});
