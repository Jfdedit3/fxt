import { notFound, redirect } from "next/navigation";
import { validYouTubeId } from "../../youtube-url.mjs";
export default async function Alias({ params }) {
  const { id } = await params;
  if (!validYouTubeId("shorts", id)) notFound();
  redirect(`/youtube/shorts/${id}`);
}
