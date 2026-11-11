import { buildDiscordComponent, componentOrigin } from "../../../../discord-component.mjs";
import { getPostResult, validParams } from "../../../../post-data.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request, { params }) {
  const { username, id } = await params;
  const errorHeaders = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (!validParams(username, id)) return Response.json({ error: "Post not found." }, { status: 404, headers: errorHeaders });
  // Discord gives the complete unfurl a 10-second budget. Leave time for the
  // payload and media fetches; abort retries once our source budget is spent.
  const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(6500)]);
  const result = await getPostResult(username, id, (url, options) => fetch(url, { ...options, signal: AbortSignal.any([options.signal, deadline]) }));
  if (result.state === "not-found") return Response.json({ error: "Post not found." }, { status: 404, headers: errorHeaders });
  if (!result.post) return Response.json({ error: "Post temporarily unavailable." }, { status: 503, headers: { ...errorHeaders, "Retry-After": "30" } });
  const payload = buildDiscordComponent(result.post, componentOrigin(request.headers, new URL(request.url).origin));
  if (!payload) return Response.json({ error: "No supported gallery available." }, { status: 404, headers: errorHeaders });
  return Response.json(payload, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" } });
}
