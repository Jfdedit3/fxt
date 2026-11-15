import sharp from "sharp";
import { mosaicSource } from "./post-mosaic-plan.mjs";
import { mediaUrl } from "./post-media.mjs";
const TILE_WIDTH = 480, TILE_HEIGHT = 400, GAP = 8, LABEL = 28, HEADER = 46;
export const mosaicLayout = count => { const columns = Math.min(4, Math.ceil(Math.sqrt(count))); return { columns, rows: Math.ceil(count / columns), width: columns * (TILE_WIDTH + GAP) + GAP, height: Math.ceil(count / columns) * (TILE_HEIGHT + LABEL + GAP) + GAP + HEADER }; };
async function imageBytes(response, signal) {
  if (response.status !== 200 || !/^image\/(jpeg|png|webp|avif)(?:;|$)/i.test(response.headers.get("content-type") || "") || Number(response.headers.get("content-length")) > 5 * 1024 * 1024) { await response.body?.cancel(); throw Error("Image unavailable"); }
  const reader = response.body?.getReader(); if (!reader) throw Error("Image unavailable");
  const chunks = []; let total = 0;
  try { while (true) { signal.throwIfAborted(); const { value, done } = await reader.read(); if (done) break; total += value.byteLength; if (total > 5 * 1024 * 1024) throw Error("Image too large"); chunks.push(value); } }
  finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}
export async function renderPostMosaic(group, total, fetcher = fetch, signal = AbortSignal.timeout(6000)) {
  if (!group?.items?.length || group.items.length > 20) throw Error("Invalid mosaic group");
  const controller = new AbortController(); signal = AbortSignal.any([signal, controller.signal]);
  const layout = mosaicLayout(group.items.length), tiles = new Array(group.items.length); let next = 0;
  async function worker() {
    while (next < group.items.length) {
      const index = next++; signal.throwIfAborted();
      const url = mosaicSource(mediaUrl(group.items[index])); if (!url) throw Error("Invalid image source");
      const response = await fetcher(url, { redirect: "error", signal, cache: "no-store", headers: { "Accept-Encoding": "identity" } });
      const buffer = await imageBytes(response, signal);
      const tile = await sharp(buffer, { limitInputPixels: 4000000, animated: false, failOn: "error" }).rotate().resize(TILE_WIDTH, TILE_HEIGHT, { fit: "contain", background: "#10111b", withoutEnlargement: false }).jpeg({ quality: 86 }).toBuffer();
      tiles[index] = { input: tile, left: GAP + index % layout.columns * (TILE_WIDTH + GAP), top: HEADER + GAP + Math.floor(index / layout.columns) * (TILE_HEIGHT + LABEL + GAP) };
    }
  }
  const workers = Array.from({ length: Math.min(4, group.items.length) }, worker);
  try { await Promise.all(workers); } catch (error) { controller.abort(); await Promise.allSettled(workers); throw error; }
  signal.throwIfAborted();
  const labels = group.items.map((_item, index) => `<text x="${GAP + index % layout.columns * (TILE_WIDTH + GAP) + 8}" y="${HEADER + GAP + Math.floor(index / layout.columns) * (TILE_HEIGHT + LABEL + GAP) + TILE_HEIGHT + 20}">${group.first + index}</text>`).join("");
  const overlay = Buffer.from(`<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg"><g fill="#f4f5ff" font-family="sans-serif" font-size="18"><text x="16" y="29">Images ${group.first}–${group.last} / ${total}</text>${labels}</g></svg>`);
  return sharp({ create: { width: layout.width, height: layout.height, channels: 3, background: "#10111b" } }).composite([...tiles, { input: overlay, left: 0, top: 0 }]).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
const saved = new Map(), pending = new Map(); let bytes = 0;
export function cachedPostMosaic(key, render) {
  const hit = saved.get(key);
  if (hit && Date.now() - hit.at < 60000) return Promise.resolve(hit.image);
  if (hit) { bytes -= hit.image.length; saved.delete(key); }
  if (pending.has(key)) return pending.get(key);
  const task = render().then(image => {
    while (saved.size && (saved.size >= 20 || bytes + image.length > 16 * 1024 * 1024)) { const first = saved.keys().next().value; bytes -= saved.get(first).image.length; saved.delete(first); }
    if (image.length <= 16 * 1024 * 1024) { saved.set(key, { at: Date.now(), image }); bytes += image.length; }
    return image;
  }).finally(() => pending.delete(key));
  pending.set(key, task); return task;
}
