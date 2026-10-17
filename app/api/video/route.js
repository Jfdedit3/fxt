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

  if (!target) {
    return Response.json({ error: "Unsupported video URL." }, { status: 400 });
  }

  const headers = new Headers({
    Accept: request.headers.get("accept") || "*/*",
    "User-Agent": "Mozilla/5.0 FxtVideoProxy/1.0"
  });
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

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

  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
}
