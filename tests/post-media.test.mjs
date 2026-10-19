import test from "node:test";
import assert from "node:assert/strict";
import { mediaOf, previewImage, videoPlaybackUrl } from "../app/post-media.mjs";

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
