export function imageDownloadSource(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !(/(^|\.)(ytimg\.com|ggpht\.com|googleusercontent\.com)$/.test(url.hostname) || url.hostname === "pbs.twimg.com")) return null;
    return url.href;
  } catch { return null; }
}
const formats = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif" };
export async function downloadImage(request, fetcher = fetch) {
  const source = imageDownloadSource(new URL(request.url).searchParams.get("url"));
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!source) return new Response("Invalid image URL.", { status: 400, headers });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(source, { redirect: "error", signal: AbortSignal.any([request.signal, controller.signal]), cache: "no-store" });
    const type = response.headers.get("content-type")?.split(";")[0].trim();
    if (response.status !== 200 || !formats[type] || Number(response.headers.get("content-length")) > 8 * 1024 * 1024) { await response.body?.cancel(); return new Response("Image unavailable.", { status: 502, headers }); }
    const reader = response.body?.getReader(); if (!reader) return new Response("Image unavailable.", { status: 502, headers });
    let size = 0; const chunks = [];
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8 * 1024 * 1024) throw Error("Image too large"); chunks.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    const expected = response.headers.get("content-length");
    if (!size || (expected !== null && Number(expected) !== size)) return new Response("Image unavailable.", { status: 502, headers });
    return new Response(Buffer.concat(chunks), { headers: { ...headers, "Content-Type": type, "Content-Length": String(size), "Content-Disposition": `attachment; filename="fxt-image.${formats[type]}"` } });
  } catch { return new Response("Image temporarily unavailable.", { status: 502, headers }); }
  finally { clearTimeout(timer); }
}
