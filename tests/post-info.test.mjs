import test from "node:test";
import assert from "node:assert/strict";
import { countValue, localPostUrl, metadataDescription, pollChoices, postStats, postText, replyContext, safeExternalUrl } from "../app/post-info.mjs";

test("missing statistics stay hidden while real zero counts remain visible", () => {
  assert.deepEqual(postStats({ likes: 0, views: null, bookmarks: false, reposts: "12", replies: -1 }), [
    { key: "likes", label: "Likes", value: 0 }, { key: "reposts", label: "Reposts", value: 12 }
  ]);
  for (const value of [null, undefined, "", " ", NaN, Infinity, {}, -1, 1.5]) assert.equal(countValue(value), null);
});

test("structured raw text does not render as Object object", () => {
  assert.equal(postText({ raw_text: { text: "Full post text" } }), "Full post text");
  assert.equal(postText({ raw_text: {} }), "");
});

test("share description preserves statistics within the 300 character limit", () => {
  const description = metadataDescription({ text: "a".repeat(500), likes: 1234, views: 9000 }, "user");
  assert.equal(description.length, 300);
  assert.ok(description.endsWith("1,234 likes · 9,000 views"));
  assert.equal(metadataDescription(null, "user"), "View the original post by @user on X.");
});

test("reply context supports v2 and legacy schemas without unsafe destinations", () => {
  assert.deepEqual(replyContext({ replying_to: { screen_name: "alice", status: "123" } }), { handle: "alice", href: "/alice/status/123" });
  assert.deepEqual(replyContext({ replying_to: "alice", replying_to_status: "456" }), { handle: "alice", href: "/alice/status/456" });
  assert.equal(replyContext({ replying_to: "javascript:alert(1)" }), null);
  assert.equal(localPostUrl({ id: "123", author: { screen_name: "alice" } }), "/alice/status/123");
  assert.equal(localPostUrl({ id: "123/evil", author: { screen_name: "alice" } }), null);
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
});

test("polls handle absent votes and clamp malformed percentages", () => {
  assert.deepEqual(pollChoices({ total_votes: 4, choices: [{ label: "A", count: 3 }, { label: "B", count: 1 }] }).map(c => c.percent), [75, 25]);
  assert.deepEqual(pollChoices({ choices: [{ label: "A", percentage: 150 }, { label: "B", percentage: -5 }] }).map(c => c.percent), [100, 0]);
  assert.equal(pollChoices({ choices: [{ label: "A", count: 0 }] })[0].percent, 0);
  assert.deepEqual(pollChoices(null), []);
});
