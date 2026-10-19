import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

export const MAX_GIF_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_GIF_BYTES = 25 * 1024 * 1024;

export function gifSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "video.twimg.com" &&
      !url.username && !url.password && !url.port &&
      /^\/tweet_video\/[a-zA-Z0-9_-]+\.mp4$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

export function gifFilename(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}\.gif$/.test(value) ? value : "fxt-animation.gif";
}

export async function convertToGif(input, output, signal) {
  await new Promise((resolve, reject) => {
    const process = spawn(ffmpeg.path, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-threads", "1", "-filter_complex_threads", "1",
      "-i", input,
      "-filter_complex", "[0:v]fps=15,scale=w='min(640,iw)':h=-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a",
      "-loop", "0", "-fs", String(MAX_GIF_BYTES), output
    ], { stdio: ["ignore", "ignore", "pipe"], signal, timeout: 25000, killSignal: "SIGKILL" });
    process.stderr.resume();
    process.once("error", reject);
    process.once("close", code => code === 0 ? resolve() : reject(new Error("GIF conversion failed.")));
  });
  const { size } = await stat(output);
  if (size >= MAX_GIF_BYTES) throw new Error("The GIF exceeds the download size limit.");
  return size;
}
