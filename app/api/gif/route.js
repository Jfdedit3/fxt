import { createReadStream } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { convertToGif, gifFilename, gifSourceUrl, MAX_GIF_SOURCE_BYTES } from "../../gif-conversion.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const source = gifSourceUrl(query.get("url"));
  if (!source) return Response.json({ error: "Unsupported GIF source." }, { status: 400 });
  let directory;
  try {
    const response = await fetch(source, {
      headers: { Accept: "video/mp4", "User-Agent": "FxtGifDownload/1.0" },
      redirect: "error", cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)])
    });
    if (response.status !== 200 || !response.body || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "video/mp4") {
      await response.body?.cancel();
      return Response.json({ error: "The GIF source is unavailable." }, { status: 502 });
    }
    if (Number(response.headers.get("content-length")) > MAX_GIF_SOURCE_BYTES) {
      await response.body.cancel();
      return Response.json({ error: "This animation is too large to convert." }, { status: 413 });
    }
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > MAX_GIF_SOURCE_BYTES) return Response.json({ error: "This animation is too large to convert." }, { status: 413 });
      chunks.push(Buffer.from(chunk));
    }
    directory = await mkdtemp(join(tmpdir(), "fxt-gif-"));
    const input = join(directory, "source.mp4");
    const output = join(directory, "animation.gif");
    await writeFile(input, Buffer.concat(chunks));
    const size = await convertToGif(input, output, request.signal);
    const stream = createReadStream(output);
    const cleanupDirectory = directory;
    stream.once("close", () => { void rm(cleanupDirectory, { recursive: true, force: true }); });
    const result = new Response(Readable.toWeb(stream), {
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="${gifFilename(query.get("filename"))}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
    directory = null;
    return result;
  } catch {
    return Response.json({ error: "GIF conversion failed. Please try again." }, { status: 502 });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
