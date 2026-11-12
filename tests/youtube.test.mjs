import test from "node:test";
import assert from "node:assert/strict";
import { normalizeYouTubeUrl, validYouTubeId } from "../app/youtube-url.mjs";
import { initialJson, parseYouTubeHtml, getYouTubeResult, youtubeImage } from "../app/youtube-data.mjs";
import { youtubeComponent, youtubePreviewHtml } from "../app/youtube-preview.mjs";
const id = "UgkxvF-Ikos2vcUfuu-7iS9zo0eW2S7c5RYG";
const thumbs = number => ({ thumbnails: [{ url: `https://yt3.ggpht.com/post-${number}=s640` }] });
const post = { postId: id, authorText: { runs: [{ text: "Creator" }] }, contentText: { runs: [{ text: "Gallery </script> & @everyone" }] }, backstageAttachment: { postMultiImageRenderer: { images: [1, 2, 3].map(n => ({ backstageImageRenderer: { image: thumbs(n) } })) } } };
const html = `var ytInitialData = ${JSON.stringify({ contents: [{ backstagePostRenderer: post }, { postId: "unrelated", contentText: { simpleText: "Do not use" } }] })};`;

test("YouTube links accept posts, videos, shorts and sharing hosts without tracking", () => {
  assert.equal(normalizeYouTubeUrl(`https://youtube.com/post/${id}?surface=shorts&data=tracking`), `/youtube/post/${id}`);
  for (const url of ["https://youtube.com/watch?v=jNQXAC9IVRw&si=tracking", "youtu.be/jNQXAC9IVRw?t=12", "https://m.youtube.com/live/jNQXAC9IVRw"]) assert.equal(normalizeYouTubeUrl(url), "/youtube/watch/jNQXAC9IVRw");
  assert.equal(normalizeYouTubeUrl("https://youtube.com/shorts/jNQXAC9IVRw?si=tracking"), "/youtube/shorts/jNQXAC9IVRw");
  for (const url of ["https://youtube.com.evil.test/watch?v=jNQXAC9IVRw", "https://user@youtube.com/watch?v=jNQXAC9IVRw", "https://youtube.com:444/watch?v=jNQXAC9IVRw", "https://youtube.com/watch?v=../"]) assert.equal(normalizeYouTubeUrl(url), null);
  assert.equal(validYouTubeId("invalid", "jNQXAC9IVRw"), false);
});

test("community parsing keeps the requested post's images in their original order", () => {
  const { item, state } = parseYouTubeHtml(html, "post", id);
  assert.equal(state, "ready"); assert.equal(item.author, "Creator");
  assert.deepEqual(item.images, [1, 2, 3].map(n => `https://yt3.ggpht.com/post-${n}=s640`));
  assert.equal(parseYouTubeHtml(html, "post", `${id}a`).state, "unavailable");
  const inline = youtubeComponent(item); assert.ok(Buffer.byteLength(inline) <= 3000);
  assert.equal(JSON.parse(inline).component.components.find(c => c.type === 12).items.length, 3);
  assert.ok(!inline.includes("</script>")); assert.ok(!inline.includes("@everyone"));
  assert.ok(youtubePreviewHtml(item, "https://fxt.test").includes('id="discord:component-embed"'));
});

test("initial JSON extraction handles braces, escaped quotes and unrelated scripts without eval", () => {
  const data = { text: 'brace } and quote " escaped', nested: { x: 1 } };
  assert.deepEqual(initialJson(`window["ytInitialData"] = ${JSON.stringify(data)};`, "ytInitialData"), data);
  assert.equal(initialJson("var ytInitialData = {invalid};", "ytInitialData"), null);
});

test("video and Shorts metadata uses the official player rather than a scraped MP4", () => {
  const source = `var ytInitialPlayerResponse = ${JSON.stringify({ videoDetails: { videoId: "jNQXAC9IVRw", title: "A video", author: "Creator", shortDescription: "Description", viewCount: "123", thumbnail: thumbs(1) } })};`;
  const { item } = parseYouTubeHtml(source, "shorts", "jNQXAC9IVRw");
  assert.equal(item.videoId, "jNQXAC9IVRw"); assert.equal(item.kind, "shorts");
  const preview = youtubePreviewHtml(item, "https://fxt.test");
  assert.ok(preview.includes("https://www.youtube.com/embed/jNQXAC9IVRw"));
  assert.ok(preview.includes('property="og:video:type" content="text/html"'));
  assert.equal(parseYouTubeHtml(source, "watch", "aaaaaaaaaaa").state, "unavailable");
});

test("source failures, consent screens and bot challenges stay retryable; invalid IDs make no request", async () => {
  let calls = 0;
  assert.equal((await getYouTubeResult("watch", "bad", () => { calls++; })).state, "not-found"); assert.equal(calls, 0);
  for (const status of [403, 429, 503]) assert.equal((await getYouTubeResult("post", id, async () => new Response(null, { status }))).state, "unavailable");
  assert.equal((await getYouTubeResult("post", id, async () => new Response("Sign in to confirm you are not a bot"))).state, "unavailable");
  assert.equal((await getYouTubeResult("post", id, async () => new Response(null, { status: 404 }))).state, "not-found");
  assert.equal((await getYouTubeResult("post", id, async () => new Response("a".repeat(4 * 1024 * 1024 + 1)))).state, "unavailable");
  assert.equal(youtubeImage("https://example.com/evil.jpg"), null);
  assert.equal(youtubeImage("https://ytimg.com.evil.test/evil.jpg"), null);
});


test("videos recover through YouTube oEmbed when the watch page is a consent screen", async () => {
  const result = await getYouTubeResult("watch", "jNQXAC9IVRw", async url => url.includes("/oembed?") ? Response.json({ type: "video", title: "Official title", author_name: "Creator", thumbnail_url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg" }) : new Response("Consent required"));
  assert.equal(result.state, "ready"); assert.equal(result.item.title, "Official title");
  assert.equal(result.item.videoId, "jNQXAC9IVRw");
});


test("video details expose available publish date, duration, channel, views and likes", () => {
  const player = { microformat: { playerMicroformatRenderer: { publishDate: "2025-01-02" } }, videoDetails: { videoId: "jNQXAC9IVRw", title: "Video", author: "Creator", channelId: "UCaaaaaaaaaaaaaaaaaaaaaa", lengthSeconds: "61", viewCount: "123" } };
  const data = { videoPrimaryInfoRenderer: { videoActions: { menuRenderer: { topLevelButtons: [{ segmentedLikeDislikeButtonRenderer: { likeButton: { toggleButtonRenderer: { defaultText: { simpleText: "12" } } } } }] } } } };
  const result = parseYouTubeHtml(`var ytInitialPlayerResponse = ${JSON.stringify(player)}; var ytInitialData = ${JSON.stringify(data)};`, "watch", "jNQXAC9IVRw");
  assert.equal(result.item.duration, 61); assert.equal(result.item.published, "2025-01-02"); assert.equal(result.item.likes, "12"); assert.equal(result.item.channelId, "UCaaaaaaaaaaaaaaaaaaaaaa");
});
