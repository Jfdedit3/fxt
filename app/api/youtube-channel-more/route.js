import { limitedYouTubeText } from "../../youtube-data.mjs";
import { getMoreYouTubeChannel } from "../../youtube-channel-data.mjs";
import { resourceGuard, requestKey, limitedResponse } from "../../resource-limits.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export async function POST(request) {
  const rate = resourceGuard.rate("channel-pages", requestKey(request), 20);
  if (!rate.allowed) return limitedResponse(rate.retryAfter);
  const release = resourceGuard.slot("channel-pages", 8); if (!release) return limitedResponse(5);
  try {
    let text; try { text = await limitedYouTubeText(request, 25000); } catch { return Response.json({ error: "Invalid cursor." }, { status: 400 }); }
    let data; try { data = JSON.parse(text); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    const result = await getMoreYouTubeChannel(data.cursor);
    return Response.json(result, { status: result.state === "ready" ? 200 : result.state === "expired" ? 410 : 503, headers: { "Cache-Control": "no-store", ...(result.state === "unavailable" ? { "Retry-After": "30" } : {}) } });
  } finally { release(); }
}
