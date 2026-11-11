import test from "node:test";
import assert from "node:assert/strict";
import { discordPreviewHtml, inlineComponent } from "../app/discord-preview.mjs";

const post = { id: "1874143352154968122", author: { screen_name: "fever3D", name: "Author" }, text: '</script><script>alert("x")</script> & text', media: { all: [{ type: "video", url: "https://video.twimg.com/test.mp4" }, ...[1, 2, 3].map(id => ({ type: "photo", url: `https://pbs.twimg.com/${id}.jpg` }))] } };

test("Discord gets all mixed attachments inline with no competing standalone player", () => {
  const html = discordPreviewHtml(post, "https://fxt.example");
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const json = head.match(/<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(json).component.components.find(c => c.type === 12).items.length, 4);
  assert.ok(!head.includes('property="og:video"'));
  assert.ok(head.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(!html.includes('<script>alert'));
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  assert.ok(html.includes('href="https://fxt.example/fever3D/status/1874143352154968122"'));
});

test("script escaping counts toward Discord's byte limit", () => {
  assert.equal(inlineComponent({ content: "<".repeat(600) }), null);
  assert.deepEqual(JSON.parse(inlineComponent({ content: "<>&\u2028\u2029" })), { content: "<>&\u2028\u2029" });
});
