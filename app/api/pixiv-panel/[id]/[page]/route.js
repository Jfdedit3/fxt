import { getPixivArtwork } from "../../../../pixiv-data.mjs";
import { pixivPanels } from "../../../../pixiv-preview.mjs";
import { pixivImageSource, validPixivId } from "../../../../pixiv-url.mjs";
import { renderPostMosaic, cachedPostMosaic } from "../../../../post-mosaic.mjs";
import { resourceGuard, requestKey, limitedResponse } from "../../../../resource-limits.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request, { params }) {
  const { id, page } = await params, index = /^([1-9]|10)\.jpg$/.exec(page)?.[1]; const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (!validPixivId(id) || !index) return new Response("Not found.", { status: 404, headers });
  const rate = resourceGuard.rate("pixiv-panels", requestKey(request), 120); if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const release = resourceGuard.slot("pixiv-panels", 12); if (!release) return limitedResponse(5);
  try {
    const { item, state } = await getPixivArtwork(id); if (!item) return new Response("Artwork unavailable.", { status: state === "not-found" ? 404 : 503, headers });
    const panel = pixivPanels(item)[Number(index) - 1]; if (!panel) return new Response("Not found.", { status: 404, headers });
    const group = { ...panel, items: panel.images.map(image => ({ type: "photo", url: image.regular, width: image.width, height: image.height })) };
    const image = await cachedPostMosaic(`pixiv:${id}:${index}:${item.images[0].regular}`, () => renderPostMosaic(group, item.images.length, fetch, AbortSignal.any([request.signal, AbortSignal.timeout(12000)]), { resolveSource: pixivImageSource, sourceHeaders: { Referer: "https://www.pixiv.net/" } }));
    return new Response(image, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Panel temporarily unavailable.", { status: 503, headers: { ...headers, "Retry-After": "30" } }); }
  finally { release(); }
}
