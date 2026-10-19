import test from "node:test";
import assert from "node:assert/strict";
import { isGif, isVideo, mediaOf, previewImage, previewVideo, thumbnailUrl, videoDownloadUrl, videoPlaybackUrl } from "../app/post-media.mjs";

test("shared media keeps every photo and prefers the album mosaic for previews", () => {
  const photos = [1, 2, 3].map(id => ({ id: "reused", type: "photo", url: `https://pbs.twimg.com/media/${id}.jpg` }));
  const post = { media: { all: photos, photos, mosaic: { formats: { jpeg: "https://mosaic.fxtwitter.com/album.jpg" } } } };
  assert.equal(mediaOf(post).length, 3);
  assert.equal(previewImage(post), "https://mosaic.fxtwitter.com/album.jpg");
  assert.equal(previewImage({ media: { photos } }), photos[0].url);
  assert.equal(previewImage(null), null);
});

test("shared video playback retains the restricted streaming proxy", () => {
  const url = "https://video.twimg.com/example.mp4";
  assert.equal(videoPlaybackUrl(url), `/api/video?url=${encodeURIComponent(url)}`);
  assert.equal(videoPlaybackUrl("javascript:alert(1)"), null);
});

test("FxTwitter GIF MP4s use video playback and their thumbnail in previews", () => {
  const gif = {
    id: "2111942437266706432", type: "gif", format: "video/mp4",
    url: "https://video.twimg.com/tweet_video/HU8gdQda0AAx8Ct.mp4",
    thumbnail_url: "https://pbs.twimg.com/tweet_video_thumb/HU8gdQda0AAx8Ct.jpg"
  };
  const post = { media: { all: [gif], videos: [gif] } };
  assert.equal(mediaOf(post).length, 1);
  assert.equal(isGif(gif), true);
  assert.equal(isVideo(gif), true);
  assert.equal(previewImage(post), gif.thumbnail_url);
  assert.equal(thumbnailUrl({ type: "gif", url: gif.url }), null);
  assert.equal(videoPlaybackUrl(gif.url), `/api/video?url=${encodeURIComponent(gif.url)}`);
});

test("legacy GIF types, native GIF images, ordinary videos and photos remain distinct", () => {
  assert.equal(isVideo({ type: "animated_gif", url: "https://video.twimg.com/gif.mp4" }), true);
  assert.equal(isGif({ kind: "GIF" }), true);
  const native = { type: "gif", url: "https://example.com/animation.gif?size=large" };
  assert.equal(isVideo(native), false);
  assert.equal(previewImage({ media: { photos: [native] } }), native.url);
  assert.equal(isVideo({ type: "video" }), true);
  assert.equal(isGif({ type: "video" }), false);
  assert.equal(isVideo({ type: "photo", url: "https://pbs.twimg.com/photo.jpg" }), false);
});

test("video previews expose the GIF stream, dimensions and correct MIME type", () => {
  const item = { type: "gif", url: "https://video.twimg.com/tweet_video/HU8gdQda0AAx8Ct.mp4", width: 1164, height: 1010, format: "video/mp4", thumbnail_url: "https://pbs.twimg.com/tweet_video_thumb/HU8gdQda0AAx8Ct.jpg" };
  assert.deepEqual(previewVideo({ media: { all: [item] } }), {
    url: item.url, type: "video/mp4", width: 1164, height: 1010, poster: item.thumbnail_url, gif: true
  });
  assert.equal(previewVideo({ media: { photos: [{ type: "photo", url: "https://example.com/photo.jpg" }] } }), null);
  assert.equal(previewVideo({ media: { videos: [{ type: "video", url: "javascript:alert(1)" }] } }), null);
  const fallback = previewVideo({ media: { videos: [{ type: "video", url: item.url, width: -1, height: Infinity, format: "text/html" }] } });
  assert.equal(fallback.width, 640); assert.equal(fallback.height, 360); assert.equal(fallback.type, "video/mp4");
  assert.equal(previewVideo(null), null);
});

test("download links request a complete MP4 with a safe file extension", () => {
  const source = "https://video.twimg.com/tweet_video/example.mp4";
  const url = new URL(videoDownloadUrl(source, "fxt-post-1.mp4"), "https://fxt.example");
  assert.equal(url.pathname, "/api/video");
  assert.equal(url.searchParams.get("url"), source);
  assert.equal(url.searchParams.get("download"), "1");
  assert.equal(url.searchParams.get("filename"), "fxt-post-1.mp4");
  assert.equal(new URL(videoDownloadUrl(source, "../bad.html"), "https://fxt.example").searchParams.get("filename"), "fxt-video.mp4");
  assert.equal(videoDownloadUrl("https://example.com/video.mp4"), null);
  assert.equal(videoDownloadUrl("https://video.twimg.com/image.gif"), null);
});
