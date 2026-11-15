import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/discord-preview/route.js";
test("Discord crawler previews work when a rewrite keeps the original URL without query parameters", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => { assert.ok(String(url).includes("2121376693227294813")); return Response.json({ status: { id: "2121376693227294813", author: { screen_name: "TakhiAI", name: "Author" }, text: "A post", media: { photos: [{ type: "photo", url: "https://pbs.twimg.com/media/a.jpg" }] } } }); };
  try {
    const response = await GET(new Request("https://fxt.example/TakhiAI/status/2121376693227294813"));
    assert.equal(response.status, 200); assert.ok((await response.text()).includes("TakhiAI"));
    const withQuery = await GET(new Request("https://fxt.example/TakhiAI/status/2121376693227294813?username=Other&id=1"));
    assert.equal(withQuery.status, 200);
  } finally { globalThis.fetch = original; }
});
