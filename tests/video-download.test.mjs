import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../app/api/video/route.js", import.meta.url), "utf8");
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const target = "https://video.twimg.com/tweet_video/example.mp4";
const request = (query, headers = {}) => new Request(`https://fxt.example/api/video?url=${encodeURIComponent(target)}${query}`, { headers });

test("downloads fetch the entire file and supply an MP4 attachment name", async t => {
  const bytes = new Uint8Array([0, 0, 0, 12, 102, 116, 121, 112, 109, 112, 52, 50]);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, target); assert.equal(options.headers.get("range"), null);
    return new Response(bytes, { headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) } });
  });
  const response = await GET(request("&download=1&filename=fxt-post-1.mp4", { Range: "bytes=0-3" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="fxt-post-1.mp4"');
  assert.equal(response.headers.get("accept-ranges"), "none");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

test("downloads reject partial data and non-video responses", async t => {
  for (const [status, type] of [[206, "video/mp4"], [200, "text/html"]]) {
    const mock = t.mock.method(globalThis, "fetch", async () => new Response("incomplete", { status, headers: { "Content-Type": type } }));
    const response = await GET(request("&download=1"));
    assert.equal(response.status, 502); assert.equal(response.headers.get("content-disposition"), null);
    mock.mock.restore();
  }
});

test("ordinary playback retains byte ranges and safe download names have a fallback", async t => {
  const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers.get("range"), "bytes=0-3");
    return new Response("data", { status: 206, headers: { "Content-Type": "video/mp4", "Content-Range": "bytes 0-3/12" } });
  });
  const stream = await GET(request("", { Range: "bytes=0-3" }));
  assert.equal(stream.status, 206); assert.equal(stream.headers.get("content-disposition"), null);
  mock.mock.restore();
  t.mock.method(globalThis, "fetch", async () => new Response("data", { headers: { "Content-Type": "video/mp4" } }));
  const download = await GET(request("&download=1&filename=bad%0D%0A.html"));
  assert.equal(download.headers.get("content-disposition"), 'attachment; filename="fxt-video.mp4"');
});
