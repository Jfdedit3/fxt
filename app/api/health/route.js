import { cachedHealth } from "../../health-check.mjs";
import { resourceGuard, requestKey, limitedResponse } from "../../resource-limits.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function GET(request) {
  const rate = resourceGuard.rate("health", requestKey(request), 6); if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const result = await cachedHealth();
  return Response.json(result, { status: result.status === "operational" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
