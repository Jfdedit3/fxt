import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { buildDiscordComponent, componentBytes } from "../app/discord-component.mjs";
import { discordPreviewHtml } from "../app/discord-preview.mjs";
import { postMosaicPlan, mosaicSource } from "../app/post-mosaic-plan.mjs";
import { renderPostMosaic, cachedPostMosaic, mosaicLayout } from "../app/post-mosaic.mjs";
const photos = count => Array.from({ length: count }, (_value, index) => ({ type: "photo", url: `https://pbs.twimg.com/media/image-${index + 1}.jpg?name=orig` }));
const post = count => ({ id: "2121376693227294813", author: { screen_name: "TakhiAI", name: "Author" }, text: "An album", media: { all: photos(count) } });

test("one original post URL describes every photo in two full-width mosaics for 12 and 20 images", () => {
  for (const count of [12, 20]) {
    const album = post(count), plan = postMosaicPlan(album); assert.equal(plan.total, count); assert.equal(plan.groups.length, 2);
    assert.deepEqual(plan.groups.flatMap(group => group.items.map(item => item.url)), photos(count).map(item => item.url));
    const payload = buildDiscordComponent(album, "https://fxt.example");
    const galleries = payload.component.components.filter(component => component.type === 12);
    assert.equal(galleries.length, 2); assert.equal(galleries.flatMap(gallery => gallery.items).length, 2);
    assert.ok(componentBytes(payload) <= 3000);
    assert.deepEqual(galleries.map(gallery => gallery.items[0].media.url), [1, 2].map(page => `https://fxt.example/api/post-mosaic/TakhiAI/2121376693227294813/${page}.jpg`));
    assert.ok(discordPreviewHtml(album, "https://fxt.example").includes('property="og:image" content="https://fxt.example/api/post-mosaic/TakhiAI/2121376693227294813/1.jpg"'));
  }
  assert.equal(postMosaicPlan(post(10)), null);
});

test("mosaic generation contains every source tile in order and returns a real JPEG", async () => {
  const plan = postMosaicPlan(post(12));
  const colors = [[220,20,20],[20,220,20],[20,20,220],[220,220,20],[220,20,220],[20,220,220]];
  const sources = await Promise.all(colors.map(([r,g,b]) => sharp({ create: { width: 32, height: 32, channels: 3, background: { r,g,b } } }).jpeg().toBuffer()));
  const requests = [];
  const result = await renderPostMosaic(plan.groups[0], 12, async (url, options) => {
    requests.push(url); assert.equal(options.redirect, "error"); assert.equal(new URL(url).searchParams.get("name"), "medium");
    const index = Number(/image-(\d+)/.exec(url)[1]) - 1;
    return new Response(sources[index], { headers: { "Content-Type": "image/jpeg" } });
  });
  assert.equal(requests.length, 6); assert.equal((await sharp(result).metadata()).format, "jpeg");
  const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, mosaicLayout(6).width);
  for (let index = 0; index < colors.length; index++) {
    const x = 8 + index % 3 * 488 + 240, y = 46 + 8 + Math.floor(index / 3) * 436 + 200;
    const pixel = (y * info.width + x) * info.channels;
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(data[pixel + channel] - colors[index][channel]) < 25, `tile ${index + 1}, channel ${channel}`);
  }
});

test("mosaics refuse unrelated sources, non-image bodies and share successful rendering", async () => {
  for (const url of ["https://example.com/a.jpg", "https://pbs.twimg.com.evil.test/media/a.jpg", "https://pbs.twimg.com/redirect.jpg", "http://pbs.twimg.com/media/a.jpg", "https://user@pbs.twimg.com/media/a.jpg"]) assert.equal(mosaicSource(url), null);
  await assert.rejects(renderPostMosaic(postMosaicPlan(post(12)).groups[0], 12, async () => new Response("not image", { headers: { "content-type": "text/html" } })));
  let calls = 0; const build = async () => { calls++; return Buffer.from("cached image"); };
  const [a,b] = await Promise.all([cachedPostMosaic("unit-cache", build), cachedPostMosaic("unit-cache", build)]);
  assert.equal(a.toString(), b.toString()); assert.equal(calls, 1);
});
