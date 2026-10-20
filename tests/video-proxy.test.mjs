import test from "node:test";
import assert from "node:assert/strict";
import { GET, HEAD } from "../app/api/video/route.js";

const source = "https://video.twimg.com/tweet_video/test.mp4";
const url = `https://fxt.example/api/video?url=${encodeURIComponent(source)}`;

test("proxy disallows redirects and HEAD probes do not download the body", async t => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.redirect, "error"); assert.equal(options.method, "HEAD");
    assert.ok(options.signal);
    return new Response(null, { headers: { "Content-Type": "video/mp4", "Content-Length": "100" } });
  });
  const response = await HEAD(new Request(url, { method: "HEAD" }));
  assert.equal(response.status, 200); assert.equal(response.body, null);
});

test("client cancellation reaches the upstream request", async t => {
  let signal;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    signal = options.signal;
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); } }), { headers: { "Content-Type": "video/mp4" } });
  });
  const response = await GET(new Request(url));
  await response.body.cancel();
  assert.equal(signal.aborted, true);
});

test("stalled upstream headers time out instead of holding a slot forever", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true })));
  const response = GET(new Request(url));
  t.mock.timers.tick(8001);
  assert.equal((await response).status, 504);
});

test("credentials, nonstandard ports and unrelated paths are rejected before fetching", async () => {
  for (const target of ["https://user@video.twimg.com/test.mp4", "https://video.twimg.com:444/test.mp4", "https://video.twimg.com/not-a-video"]) {
    assert.equal((await GET(new Request(`https://fxt.example/api/video?url=${encodeURIComponent(target)}`))).status, 400);
  }
});
