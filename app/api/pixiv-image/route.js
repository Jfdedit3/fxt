import { servePixivImage } from "../../pixiv-images.mjs";
import { resourceGuard, requestKey, limitedResponse } from "../../resource-limits.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function GET(request) {
  const rate = resourceGuard.rate("pixiv-images", requestKey(request), 120); if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const release = resourceGuard.slot("pixiv-images", 12); if (!release) return limitedResponse(5);
  try { return await servePixivImage(request); } finally { release(); }
}
