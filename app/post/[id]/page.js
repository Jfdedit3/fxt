import { notFound, redirect } from "next/navigation";
import { validYouTubeId } from "../../youtube-url.mjs";
export default async function Alias({ params }) {
  const { id } = await params;
  if (!validYouTubeId("post", id)) notFound();
  redirect(`/youtube/post/${id}`);
}
