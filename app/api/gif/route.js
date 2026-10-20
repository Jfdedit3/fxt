import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { gifFilename, gifSourceUrl } from "../../gif-conversion.mjs";
import { GifBusyError, prepareGif } from "../../gif-service.mjs";
import { limitedResponse, requestKey, resourceGuard } from "../../resource-limits.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const source = gifSourceUrl(query.get("url"));
  if (!source) return Response.json({ error: "Unsupported GIF source." }, { status: 400 });
  const rate = resourceGuard.rate("gif", requestKey(request), 6);
  if (!rate.allowed) return limitedResponse(rate.retryAfter);
  try {
    const result = await prepareGif(source);
    return new Response(Readable.toWeb(createReadStream(result.path)), {
      headers: {
        "Content-Type": "image/gif", "Content-Length": String(result.size),
        "Content-Disposition": `attachment; filename="${gifFilename(query.get("filename"))}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof GifBusyError) return limitedResponse();
    return Response.json({ error: "GIF conversion is temporarily unavailable. Please try again shortly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
