import { downloadImage } from "../../image-download.mjs";
import { resourceGuard, requestKey, limitedResponse } from "../../resource-limits.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function GET(request) {
  const rate = resourceGuard.rate("images", requestKey(request), 30);
  if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const release = resourceGuard.slot("images", 8);
  if (!release) return limitedResponse(5);
  try { return await downloadImage(request); } finally { release(); }
}
