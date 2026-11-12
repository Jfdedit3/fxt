import test from "node:test";
import assert from "node:assert/strict";
import { getYouTubeResult } from "../app/youtube-data.mjs";
test("YouTube shares fresh successes, retries challenges and serves recent data only during temporary outages", async () => {
  const previous = globalThis.fetch, clock = Date.now;
  let now = 100000, calls = 0, status = 200;
  Date.now = () => now;
  globalThis.fetch = async () => { calls++; return status === 200 ? new Response('var ytInitialPlayerResponse = {"videoDetails":{"videoId":"cacheTest01","title":"Cached title","author":"Creator"}};') : new Response(null, { status }); };
  // IDs are exactly eleven URL-safe characters.
  const id = "cacheTest01";
  try {
    const [first, second] = await Promise.all([getYouTubeResult("watch", id), getYouTubeResult("watch", id)]);
    assert.equal(first.item.title, "Cached title"); assert.equal(second.item.title, "Cached title"); assert.equal(calls, 1);
    await getYouTubeResult("watch", id); assert.equal(calls, 1);
    now += 61000; status = 503;
    assert.equal((await getYouTubeResult("watch", id)).stale, true);
    const afterFailure = calls; await getYouTubeResult("watch", id); assert.ok(calls > afterFailure);
    status = 404; assert.equal((await getYouTubeResult("watch", id)).state, "not-found");
    status = 503; assert.equal((await getYouTubeResult("watch", id)).item, null);
  } finally { globalThis.fetch = previous; Date.now = clock; }
});
