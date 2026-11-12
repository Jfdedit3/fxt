import { getYouTubeResult } from "../../youtube-data.mjs";
import { youtubePreviewHtml } from "../../youtube-preview.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function GET(request) {
  const url = new URL(request.url);
  const result = await getYouTubeResult(url.searchParams.get("kind"), url.searchParams.get("id"));
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", Vary: "User-Agent", "X-Content-Type-Options": "nosniff" };
  if (!result.item) return new Response(result.state === "not-found" ? "YouTube content not found." : "YouTube content temporarily unavailable.", { status: result.state === "not-found" ? 404 : 503, headers: { ...headers, "X-Robots-Tag": "noindex", ...(result.state === "not-found" ? {} : { "Retry-After": "30" }) } });
  return new Response(youtubePreviewHtml(result.item, url.origin), { headers });
}
