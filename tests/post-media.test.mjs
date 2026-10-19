import test from "node:test";
import assert from "node:assert/strict";
import { isGif, isVideo, mediaOf, previewImage, thumbnailUrl, videoPlaybackUrl } from "../app/post-media.mjs";

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
