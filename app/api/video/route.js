export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set(["video.twimg.com"]);

function allowedVideoUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const incoming = new URL(request.url);
  const rawUrl = incoming.searchParams.get("url");
  const target = rawUrl ? allowedVideoUrl(rawUrl) : null;
  const download = incoming.searchParams.get("download") === "1";

  if (!target || (download && !/\.mp4$/i.test(target.pathname))) {
    return Response.json({ error: "Unsupported video URL." }, { status: 400 });
  }

  const headers = new Headers({
    Accept: request.headers.get("accept") || "*/*",
    "User-Agent": "Mozilla/5.0 FxtVideoProxy/1.0"
  });
  const range = request.headers.get("range");
  // A download must fetch the complete file, rather than the player's current
  // buffered byte range. Streaming requests keep range support for seeking.
  if (range && !download) headers.set("Range", range);

  let upstream;
  try {
    upstream = await fetch(target.href, {
      method: "GET",
      headers,
      redirect: "follow",
      cache: "no-store"
    });
  } catch {
    return new Response("Video source unavailable.", { status: 502 });
  }

  if (![200, 206, 416].includes(upstream.status)) {
    return new Response("Video source rejected the request.", { status: upstream.status === 404 ? 404 : 502 });
  }

  if (download && (upstream.status !== 200 || upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "video/mp4")) {
    await upstream.body?.cancel();
    return new Response("The complete MP4 file is unavailable. Please try again.", { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  if (download) {
    const requested = incoming.searchParams.get("filename") || "";
    const filename = /^[a-zA-Z0-9_-]{1,100}\.mp4$/.test(requested) ? requested : "fxt-video.mp4";
    responseHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    responseHeaders.set("Accept-Ranges", "none");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
}
