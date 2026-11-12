import { startSeconds, timeQuery } from "../../youtube-time.mjs";
import { notFound, redirect } from "next/navigation";
import { validYouTubeId } from "../../youtube-url.mjs";
export default async function Alias({ params, searchParams }) {
  const { id } = await params;
  if (!validYouTubeId("shorts", id)) notFound();
  const search = await searchParams;
  redirect(`/youtube/shorts/${id}${timeQuery(startSeconds(search.t || search.start))}`);
}
