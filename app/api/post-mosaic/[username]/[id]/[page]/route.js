import { createHash } from "node:crypto";
import { getPostResult, validParams } from "../../../../../post-data.mjs";
import { postMosaicPlan } from "../../../../../post-mosaic-plan.mjs";
import { cachedPostMosaic, renderPostMosaic } from "../../../../../post-mosaic.mjs";
import { resourceGuard, requestKey, limitedResponse } from "../../../../../resource-limits.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function GET(request, { params }) {
  const { username, id, page } = await params;
  const number = /^([1-9]|10)\.jpg$/.exec(page)?.[1];
  const errors = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (!validParams(username, id) || !number) return new Response("Not found.", { status: 404, headers: errors });
  const rate = resourceGuard.rate("post-mosaics", requestKey(request), 30); if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const release = resourceGuard.slot("post-mosaics", 4); if (!release) return limitedResponse(5);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 7500);
  const signal = AbortSignal.any([controller.signal, request.signal]);
  try {
    const result = await getPostResult(username, id, (url, options) => fetch(url, { ...options, signal: AbortSignal.any([options.signal, signal]) }));
    if (result.state === "not-found") return new Response("Not found.", { status: 404, headers: errors });
    if (!result.post) return new Response("Temporarily unavailable.", { status: 503, headers: { ...errors, "Retry-After": "30" } });
    const plan = postMosaicPlan(result.post), group = plan?.groups[Number(number) - 1];
    if (!group) return new Response("Not found.", { status: 404, headers: errors });
    const digest = createHash("sha256").update(JSON.stringify(group.items)).digest("hex");
    const image = await cachedPostMosaic(`${id}:${number}:${digest}`, () => renderPostMosaic(group, plan.total, fetch, signal));
    return new Response(image, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(image.length), "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" } });
  } catch { return new Response("Mosaic temporarily unavailable.", { status: 503, headers: { ...errors, "Retry-After": "30" } }); }
  finally { controller.abort(); clearTimeout(timer); release(); }
}
