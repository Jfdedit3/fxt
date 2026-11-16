import { getPixivArtwork } from "../../pixiv-data.mjs";
import { pixivPreviewHtml } from "../../pixiv-preview.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function GET(request) {
  const url = new URL(request.url), id = /^\/pixiv\/artworks\/(\d+)\/?$/.exec(url.pathname)?.[1] || url.searchParams.get("id");
  const result = await getPixivArtwork(id); const headers = { "Cache-Control": "private, no-store", Vary: "User-Agent", "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" };
  if (!result.item) return new Response("Pixiv artwork unavailable.", { status: result.state === "not-found" ? 404 : 503, headers: { ...headers, "X-Robots-Tag": "noindex" } });
  return new Response(pixivPreviewHtml(result.item, url.origin), { headers });
}
