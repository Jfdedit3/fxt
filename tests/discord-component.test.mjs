import test from "node:test";
import assert from "node:assert/strict";
import { buildDiscordComponent, componentBytes, componentOrigin, DISCORD_COMPONENT_MAX_BYTES, hasMultipleVideos } from "../app/discord-component.mjs";

const videos = Array.from({ length: 4 }, (_value, index) => ({ type: "video", url: `https://video.twimg.com/amplify_video/video-${index + 1}.mp4?tag=14` }));
const post = { id: "2120247287821529191", author: { screen_name: "GodoffuryN", name: "Author" }, text: "Four videos", media: { all: videos, videos } };
const gallery = payload => payload.component.components.find(component => component.type === 12);

test("one Discord component embed contains all four distinct videos", () => {
  const payload = buildDiscordComponent(post, "https://fxt.example");
  assert.equal(payload.component.type, 17);
  assert.deepEqual(Object.keys(payload), ["component"]);
  assert.deepEqual(gallery(payload).items.map(item => item.media.url), videos.map(video => video.url));
  assert.equal(hasMultipleVideos(post), true);
  assert.ok(componentBytes(payload) <= 3000);
});

test("Discord's byte budget prioritizes all media over long Unicode text and descriptions", () => {
  const large = { ...post, author: { ...post.author, name: "😀".repeat(1000) }, text: "😀".repeat(10000), media: { all: videos.map(video => ({ ...video, altText: "Long description ".repeat(100) })) } };
  const payload = buildDiscordComponent(large, "https://fxt.example");
  assert.ok(payload);
  assert.ok(componentBytes(payload) <= DISCORD_COMPONENT_MAX_BYTES);
  assert.equal(gallery(payload).items.length, 4);
});

test("gallery supports mixed media and obeys the ten-item limit", () => {
  const mixed = { ...post, media: { all: [{ type: "photo", url: "https://pbs.twimg.com/photo.jpg" }, ...videos] } };
  assert.equal(gallery(buildDiscordComponent(mixed, "https://fxt.example")).items.length, 5);
  const many = { ...post, media: { all: Array.from({ length: 12 }, (_value, index) => ({ type: "video", url: `https://video.twimg.com/${index}.mp4` })) } };
  assert.equal(gallery(buildDiscordComponent(many, "https://fxt.example")).items.length, 10);
});

test("unsupported sources fall back rather than publishing invalid Discord payloads", () => {
  const invalid = { ...post, media: { all: [{ type: "video", url: "javascript:alert(1)" }, { type: "video", url: "https://example.com/watch" }] } };
  assert.equal(buildDiscordComponent(invalid, "https://fxt.example"), null);
  const oversized = { ...post, media: { all: videos.map((video, index) => ({ ...video, url: `https://video.twimg.com/${index}.mp4?padding=${"a".repeat(1200)}` })) } };
  assert.equal(buildDiscordComponent(oversized, "https://fxt.example"), null);
  const malicious = { ...post, text: "@everyone <@123> **not trusted markdown**" };
  const json = JSON.stringify(buildDiscordComponent(malicious, "https://fxt.example"));
  assert.ok(!json.includes("@everyone"));
});

test("linked JSON uses the actual page host including preview and test domains", () => {
  assert.equal(componentOrigin(new Headers({ host: "127.0.0.1:3100" }), "https://fxt.example"), "http://127.0.0.1:3100");
  assert.equal(componentOrigin(new Headers({ "x-forwarded-host": "preview.vercel.app", "x-forwarded-proto": "https" }), "https://fxt.example"), "https://preview.vercel.app");
  assert.equal(componentOrigin(new Headers({ host: "invalid/path" }), "https://fxt.example"), "https://fxt.example");
  assert.equal(componentOrigin(new Headers({ host: "example.com:99999" }), "https://fxt.example"), "https://fxt.example");
});
