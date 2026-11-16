import { pixivImageSource } from "./pixiv-url.mjs";
export async function servePixivImage(request, fetcher = fetch) {
  const url = new URL(request.url), source = pixivImageSource(url.searchParams.get("url"));
  const errors = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!source) return new Response("Invalid image source.", { status: 400, headers: errors });
  try {
    const response = await fetcher(source, { headers: { Referer: "https://www.pixiv.net/", "Accept-Encoding": "identity" }, redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(7500)]), cache: "no-store" });
    const type = response.headers.get("content-type")?.split(";")[0]; const formats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
    if (response.status !== 200 || !formats[type] || Number(response.headers.get("content-length")) > 12 * 1024 * 1024) { await response.body?.cancel(); return new Response("Image unavailable.", { status: 502, headers: errors }); }
    const reader = response.body?.getReader(); if (!reader) return new Response("Image unavailable.", { status: 502, headers: errors });
    const chunks = []; let size = 0;
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 12 * 1024 * 1024) throw Error("Image too large"); chunks.push(value); } } finally { await reader.cancel().catch(() => {}); }
    if (!size) throw Error("Empty image");
    const download = url.searchParams.get("download") === "1";
    return new Response(Buffer.concat(chunks), { headers: { "Content-Type": type, "Content-Length": String(size), "X-Content-Type-Options": "nosniff", "Cache-Control": download ? "no-store" : "public, max-age=60, s-maxage=60", ...(download ? { "Content-Disposition": `attachment; filename="pixiv-image.${formats[type]}"` } : {}) } });
  } catch { return new Response("Image temporarily unavailable.", { status: 502, headers: errors }); }
}
