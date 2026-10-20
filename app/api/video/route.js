import { limitedResponse, requestKey, resourceGuard } from "../../resource-limits.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function allowedVideoUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "video.twimg.com" || url.port || url.username || url.password || !/\.(mp4|webm)$/i.test(url.pathname)) return null;
    return url;
  } catch { return null; }
}

async function respond(request, head = false) {
  const incoming = new URL(request.url);
  const target = allowedVideoUrl(incoming.searchParams.get("url"));
  const download = incoming.searchParams.get("download") === "1";
  if (!target || (download && !/\.mp4$/i.test(target.pathname))) return Response.json({ error: "Unsupported video URL." }, { status: 400 });
  const rate = resourceGuard.rate("video", requestKey(request), 120);
  if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const release = resourceGuard.slot("video", 16);
  if (!release) return limitedResponse();
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const timer = setTimeout(() => abort.abort(), 8000);
  const headers = new Headers({ Accept: "video/*", "User-Agent": "FxtVideoProxy/2.0" });
  const range = request.headers.get("range");
  if (range && !download && !head) headers.set("Range", range);
  let upstream;
  try {
    upstream = await fetch(target.href, { method: head ? "HEAD" : "GET", headers, redirect: "error", cache: "no-store", signal });
  } catch {
    clearTimeout(timer); release();
    return new Response("Video source unavailable.", { status: signal.aborted ? 504 : 502 });
  }
  clearTimeout(timer);
  const type = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (![200, 206, 416].includes(upstream.status) || (download && (upstream.status !== 200 || type !== "video/mp4")) || (upstream.status !== 416 && !["video/mp4", "video/webm"].includes(type))) {
    await upstream.body?.cancel(); release();
    return new Response("The video source is unavailable or incomplete.", { status: upstream.status === 404 ? 404 : 502 });
  }
  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  if (download) {
    const requested = incoming.searchParams.get("filename") || "";
    const filename = /^[a-zA-Z0-9_-]{1,100}\.mp4$/.test(requested) ? requested : "fxt-video.mp4";
    responseHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    responseHeaders.set("Accept-Ranges", "none");
  }
  if (head || !upstream.body) { release(); return new Response(null, { status: upstream.status, headers: responseHeaders }); }
  const reader = upstream.body.getReader();
  const body = new ReadableStream({
    async pull(controller) {
      const idle = setTimeout(() => abort.abort(), 30000);
      try {
        const { done, value } = await reader.read();
        if (done) { release(); controller.close(); } else controller.enqueue(value);
      } catch (error) { release(); controller.error(error); }
      finally { clearTimeout(idle); }
    },
    cancel(reason) { abort.abort(); release(); return reader.cancel(reason); }
  });
  return new Response(body, { status: upstream.status, headers: responseHeaders });
}

export function GET(request) { return respond(request); }
export function HEAD(request) { return respond(request, true); }
