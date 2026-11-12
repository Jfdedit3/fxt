import test from "node:test";
import assert from "node:assert/strict";
import { normalizeYouTubeUrl } from "../app/youtube-url.mjs";
import { startSeconds } from "../app/youtube-time.mjs";
import { sourceLabel } from "../app/source-label.mjs";
import { channelRefFromUrl, originalChannelUrl } from "../app/youtube-channel-url.mjs";
import { runHealthChecks } from "../app/health-check.mjs";
import { channelContext, encodeChannelCursor, decodeChannelCursor, getMoreYouTubeChannel } from "../app/youtube-channel-data.mjs";

test("YouTube sharing retains timestamps and old channel paths while stripping tracking", () => {
  for (const url of ["https://youtu.be/jNQXAC9IVRw?t=1m30s&si=tracking", "https://youtube.com/watch?v=jNQXAC9IVRw&start=90", "https://youtube.com/watch?v=jNQXAC9IVRw#t=90"]) assert.equal(normalizeYouTubeUrl(url), "/youtube/watch/jNQXAC9IVRw?t=90");
  assert.equal(normalizeYouTubeUrl("https://youtube.com/shorts/jNQXAC9IVRw?t=15"), "/youtube/shorts/jNQXAC9IVRw?t=15");
  assert.equal(normalizeYouTubeUrl("https://youtube.com/c/LegacyChannel/shorts"), "/youtube/channel/c~LegacyChannel?tab=shorts");
  assert.equal(channelRefFromUrl("https://www.youtube.com/user/LegacyName"), "user~LegacyName");
  assert.equal(originalChannelUrl("user~LegacyName", "posts"), "https://www.youtube.com/user/LegacyName/posts");
  for (const value of ["-1", "1e8", "900000", "javascript:alert(1)", "abc"]) assert.equal(startSeconds(value), null);
  assert.equal(startSeconds("1h2m3s"), 3723); assert.equal(startSeconds("1:30"), 90);
});

test("French source labels translate counts and relative dates without changing titles", () => {
  assert.equal(sourceLabel("2 years ago", "fr"), "il y a 2 ans"); assert.equal(sourceLabel("1 month ago (edited)", "fr"), "il y a 1 mois (modifié)");
  assert.equal(sourceLabel("1.2M subscribers", "fr"), "1,2\u00a0M abonnés"); assert.equal(sourceLabel("123 views", "fr"), "123 vues");
  assert.equal(sourceLabel("1 view", "fr"), "1 vue"); assert.equal(sourceLabel("1,234 views", "fr"), "1\u202f234 vues");
  assert.equal(sourceLabel("Creator title", "fr"), "Creator title"); assert.equal(sourceLabel("2 years ago", "en"), "2 years ago");
});

test("pagination cursors work across instances, expire and never choose an arbitrary endpoint", async () => {
  const data = { token: "page2", clientVersion: "2.20261112.00.00", channelId: "UCaaaaaaaaaaaaaaaaaaaaaa", tab: "videos", issuedAt: Date.now() };
  const cursor = encodeChannelCursor(data); assert.equal(decodeChannelCursor(cursor).token, "page2");
  assert.equal(decodeChannelCursor(encodeChannelCursor({ ...data, issuedAt: Date.now() - 3600001 })), null);
  assert.equal(decodeChannelCursor(encodeChannelCursor({ ...data, token: "https://example.com" })), null);
  assert.equal(channelContext('ytcfg.set({"INNERTUBE_CONTEXT":{"client":{"clientVersion":"2.20261112.00.00"}}});').clientVersion, data.clientVersion);
  const result = await getMoreYouTubeChannel(cursor, async (url, options) => {
    assert.equal(url, "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false"); assert.equal(JSON.parse(options.body).continuation, "page2"); assert.equal(options.redirect, "error");
    return Response.json({ onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [{ videoRenderer: { videoId: "abcdefghijk", title: { simpleText: "Next video" } } }, { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: "page2" } } } }] } }] });
  });
  assert.equal(result.state, "ready"); assert.equal(result.entries[0].id, "abcdefghijk"); assert.equal(result.cursor, null);
  assert.equal((await getMoreYouTubeChannel("bad")).state, "expired");
  assert.equal((await getMoreYouTubeChannel(cursor, async () => new Response(null, { status: 503 }))).state, "unavailable");
});

test("health checks report independent failures without leaking user or source payloads", async () => {
  const report = await runHealthChecks({ working: async () => true, broken: async () => { throw Error("secret source body"); } });
  assert.equal(report.status, "degraded"); assert.equal(report.checks[0].status, "operational"); assert.equal(report.checks[1].status, "degraded"); assert.ok(!JSON.stringify(report).includes("secret source body"));
});
