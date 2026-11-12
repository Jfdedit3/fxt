import { validYouTubeId } from "../youtube-url.mjs";
export function GET(request) {
  const url = new URL(request.url); const id = url.searchParams.get("v");
  if (!validYouTubeId("watch", id)) return new Response("Invalid YouTube video link.", { status: 404 });
  return Response.redirect(new URL(`/youtube/watch/${id}`, url.origin), 307);
}
