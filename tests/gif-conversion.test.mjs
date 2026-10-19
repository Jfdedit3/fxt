import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { convertToGif, gifFilename, gifSourceUrl } from "../app/gif-conversion.mjs";
import { gifDownloadUrl } from "../app/post-media.mjs";

test("GIF download URLs and filenames accept only supported animation assets", () => {
  const source = "https://video.twimg.com/tweet_video/example.mp4";
  assert.equal(gifSourceUrl(source), source);
  for (const url of ["https://example.com/tweet_video/a.mp4", "http://video.twimg.com/tweet_video/a.mp4", "https://video.twimg.com/amplify_video/a.mp4", "https://video.twimg.com:444/tweet_video/a.mp4"]) assert.equal(gifSourceUrl(url), null);
  const url = new URL(gifDownloadUrl(source, "fxt-post.gif"), "https://fxt.example");
  assert.equal(url.pathname, "/api/gif");
  assert.equal(url.searchParams.get("filename"), "fxt-post.gif");
  assert.equal(gifFilename("bad.mp4"), "fxt-animation.gif");
  assert.equal(gifFilename("bad\r\n.gif"), "fxt-animation.gif");
});

test("MP4 conversion produces a real animated GIF, rather than a renamed MP4", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fxt-gif-test-"));
  try {
    const input = join(directory, "test.mp4");
    const output = join(directory, "test.gif");
    await promisify(execFile)(ffmpeg.path, ["-nostdin", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=32x32:rate=10", "-t", "0.4", "-pix_fmt", "yuv420p", input]);
    const size = await convertToGif(input, output);
    const bytes = await readFile(output);
    assert.equal(bytes.subarray(0, 6).toString(), "GIF89a");
    assert.ok(size > 100);
    await promisify(execFile)(ffmpeg.path, ["-nostdin", "-hide_banner", "-loglevel", "error", "-i", output, "-f", "null", "-"]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
