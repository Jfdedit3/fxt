import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGifService, GifBusyError } from "../app/gif-service.mjs";

test("simultaneous downloads share conversion and reuse the cached GIF", async () => {
  const root = await mkdtemp(join(tmpdir(), "fxt-service-test-"));
  let conversions = 0;
  const prepare = createGifService({ root, fetcher: async () => new Response("mp4", { headers: { "Content-Type": "video/mp4" } }), convert: async (_input, output) => {
    conversions++; await new Promise(resolve => setTimeout(resolve, 20));
    await writeFile(output, "GIF89a-fixture"); return 14;
  } });
  try {
    const [a, b] = await Promise.all([prepare("https://video.twimg.com/tweet_video/a.mp4"), prepare("https://video.twimg.com/tweet_video/a.mp4")]);
    assert.equal(a.path, b.path); assert.equal(conversions, 1);
    await prepare("https://video.twimg.com/tweet_video/a.mp4"); assert.equal(conversions, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("new conversions are rejected at capacity and failures free the slot", async () => {
  const root = await mkdtemp(join(tmpdir(), "fxt-service-test-"));
  let unblock;
  const wait = new Promise(resolve => { unblock = resolve; });
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const prepare = createGifService({ root, capacity: 1, fetcher: async () => { started(); await wait; return new Response(null, { status: 503 }); } });
  try {
    const first = prepare("https://video.twimg.com/tweet_video/a.mp4");
    const failure = assert.rejects(first);
    await ready;
    await assert.rejects(prepare("https://video.twimg.com/tweet_video/b.mp4"), GifBusyError);
    unblock(); await failure;
    await assert.rejects(prepare("https://video.twimg.com/tweet_video/b.mp4"), /source unavailable/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
