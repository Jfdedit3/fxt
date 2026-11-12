import test from "node:test";
import assert from "node:assert/strict";
import { downloadImage, imageDownloadSource } from "../app/image-download.mjs";
const request = () => new Request("https://fxt.test/api/image?url=" + encodeURIComponent("https://yt3.ggpht.com/image=s640"));
test("image downloads return an attachment with the actual format and complete body", async () => {
  const response = await downloadImage(request(), async (_url, options) => {
    assert.equal(options.redirect, "error");
    return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "content-type": "image/jpeg", "content-length": "3" } });
  });
  assert.equal(response.status, 200); assert.match(response.headers.get("content-disposition"), /attachment; filename="fxt-image.jpg"/);
  assert.equal((await response.arrayBuffer()).byteLength, 3);
});
test("image downloads reject unrelated hosts, credentials, redirects and incomplete/non-image data", async () => {
  for (const url of ["https://example.com/a.jpg", "https://ytimg.com.evil.test/a.jpg", "https://user@pbs.twimg.com/a.jpg", "http://pbs.twimg.com/a.jpg", "https://pbs.twimg.com:444/a.jpg"]) assert.equal(imageDownloadSource(url), null);
  for (const response of [new Response("html", { headers: { "content-type": "text/html" } }), new Response("short", { headers: { "content-type": "image/png", "content-length": "100" } }), new Response(null, { status: 302 }), new Response("x", { headers: { "content-type": "image/png", "content-length": "99999999" } })]) assert.equal((await downloadImage(request(), async () => response)).status, 502);
});
