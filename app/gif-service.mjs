import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { convertToGif, MAX_GIF_SOURCE_BYTES } from "./gif-conversion.mjs";

export class GifBusyError extends Error {}

export function createGifService({ root = join(tmpdir(), "fxt-gif-cache-v2"), fetcher = fetch, convert = convertToGif, capacity = 2, now = Date.now } = {}) {
  const running = new Map();
  const ttl = 3600000;
  let commit = Promise.resolve();
  async function prune(reserve = 0) {
    const entries = await readdir(root);
    const files = (await Promise.all(entries.filter(name => /^[a-f0-9]{64}\.gif$/.test(name)).map(async name => {
      const path = join(root, name);
      try { const info = await stat(path); return { path, size: info.size, time: info.mtimeMs }; } catch { return null; }
    }))).filter(Boolean).sort((a, b) => a.time - b.time);
    let bytes = files.reduce((sum, file) => sum + file.size, 0);
    for (const file of files) {
      if (bytes + reserve <= 128 * 1024 * 1024 && now() - file.time < ttl) continue;
      await rm(file.path, { force: true }); bytes -= file.size;
    }
  }
  return async function prepare(source) {
    await mkdir(root, { recursive: true });
    const output = join(root, `${createHash("sha256").update(source).digest("hex")}.gif`);
    try {
      const info = await stat(output);
      if (info.size > 0 && now() - info.mtimeMs < ttl) return { path: output, size: info.size };
    } catch { /* A cache miss needs conversion. */ }
    if (running.has(source)) return running.get(source);
    if (running.size >= capacity) throw new GifBusyError("GIF conversion capacity reached.");
    const task = (async () => {
      let directory;
      try {
        const response = await fetcher(source, { headers: { Accept: "video/mp4", "User-Agent": "FxtGifDownload/2.0" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(12000) });
        if (response.status !== 200 || !response.body || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "video/mp4") {
          await response.body?.cancel(); throw new Error("GIF source unavailable.");
        }
        if (Number(response.headers.get("content-length")) > MAX_GIF_SOURCE_BYTES) { await response.body.cancel(); throw new Error("Animation too large."); }
        const chunks = [];
        let length = 0;
        for await (const chunk of response.body) {
          length += chunk.length;
          if (length > MAX_GIF_SOURCE_BYTES) throw new Error("Animation too large.");
          chunks.push(Buffer.from(chunk));
        }
        directory = await mkdtemp(join(root, "work-"));
        const input = join(directory, "source.mp4");
        const converted = join(directory, "animation.gif");
        await writeFile(input, Buffer.concat(chunks));
        const size = await convert(input, converted);
        const saved = commit.then(async () => { await prune(size); await rename(converted, output); });
        commit = saved.catch(() => {});
        await saved;
        return { path: output, size };
      } finally { if (directory) await rm(directory, { recursive: true, force: true }); }
    })();
    running.set(source, task);
    try { return await task; } finally { running.delete(source); }
  };
}

export const prepareGif = createGifService();
