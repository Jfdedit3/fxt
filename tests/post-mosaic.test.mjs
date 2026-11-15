import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { buildDiscordComponent, componentBytes } from "../app/discord-component.mjs";
import { discordPreviewHtml } from "../app/discord-preview.mjs";
import { postMosaicPlan, mosaicSource } from "../app/post-mosaic-plan.mjs";
import { renderPostMosaic, cachedPostMosaic, mosaicLayout } from "../app/post-mosaic.mjs";
const photos = count => Array.from({ length: count }, (_value, index) => ({ type: "photo", url: `https://pbs.twimg.com/media/image-${index + 1}.jpg?name=orig` }));
const post = count => ({ id: "2121376693227294813", author: { screen_name: "TakhiAI", name: "Author" }, text: "An album", media: { all: photos(count) } });

test("one original post URL describes every photo in four-photo panels in one gallery for 12 and 20 images", () => {
  for (const count of [12, 20]) {
    const album = post(count), plan = postMosaicPlan(album); assert.equal(plan.total, count); assert.equal(plan.groups.length, count / 4);
    assert.deepEqual(plan.groups.flatMap(group => group.items.map(item => item.url)), photos(count).map(item => item.url));
    const payload = buildDiscordComponent(album, "https://fxt.example");
    const galleries = payload.component.components.filter(component => component.type === 12);
    assert.equal(galleries.length, 1); assert.equal(galleries.flatMap(gallery => gallery.items).length, count / 4);
    assert.ok(componentBytes(payload) <= 3000);
    assert.deepEqual(galleries.flatMap(gallery => gallery.items.map(item => item.media.url)), Array.from({ length: count / 4 }, (_v, i) => i + 1).map(page => `https://fxt.example/api/post-mosaic/TakhiAI/2121376693227294813/${page}-v3.jpg`));
    assert.ok(discordPreviewHtml(album, "https://fxt.example").includes('property="og:image" content="https://fxt.example/api/post-mosaic/TakhiAI/2121376693227294813/1-v3.jpg"'));
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
  assert.equal(requests.length, 4); assert.equal((await sharp(result).metadata()).format, "jpeg");
  const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, mosaicLayout(4).width);
  for (let index = 0; index < 4; index++) {
    const x = 8 + index % 2 * 648 + 320, y = 8 + Math.floor(index / 2) * 674 + 320;
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


test("portrait pairs use a taller uncropped layout and older mosaic URLs retain their groups", () => {
  const layout = mosaicLayout(2, [{ width: 600, height: 900 }, { width: 600, height: 900 }]);
  assert.equal(layout.tileWidth, 640); assert.equal(layout.tileHeight, 960); assert.equal(layout.columns, 2);
  assert.equal(postMosaicPlan(post(20), { legacy: true }).groups.length, 2);
  assert.equal(postMosaicPlan(post(11)).groups.at(-1).items.length, 3);
  assert.deepEqual(postMosaicPlan(post(13)).groups.map(group => group.items.length), [4,4,4,1]);
  const oversizedText = { ...post(20), text: "😀".repeat(5000) };
  const payload = buildDiscordComponent(oversizedText, "https://fxt.example");
  assert.ok(payload); assert.ok(componentBytes(payload) <= 3000); assert.equal(payload.component.components.filter(c => c.type === 12).length, 1);
  assert.equal(payload.component.components.find(c => c.type === 12).items.length, 5);
  assert.equal(postMosaicPlan(post(12), { version: 2 }).groups.length, 6);
});
