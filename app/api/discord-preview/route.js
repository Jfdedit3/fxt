import { getPostResult, validParams } from "../../post-data.mjs";
import { discordPreviewHtml } from "../../discord-preview.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  const id = url.searchParams.get("id");
  // The response varies by crawler identity at the original post URL. Prevent
  // intermediary caches from serving crawler HTML to people or vice versa.
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Vary": "User-Agent", "X-Content-Type-Options": "nosniff" };
  if (!validParams(username, id)) return new Response("Post not found.", { status: 404, headers });
  const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(6500)]);
  const result = await getPostResult(username, id, (source, options) => fetch(source, { ...options, signal: AbortSignal.any([options.signal, deadline]) }));
  if (result.state === "not-found") return new Response("Post not found.", { status: 404, headers });
  if (!result.post) return new Response("Post temporarily unavailable.", { status: 503, headers: { ...headers, "Retry-After": "30" } });
  return new Response(discordPreviewHtml(result.post, url.origin), { headers });
}
