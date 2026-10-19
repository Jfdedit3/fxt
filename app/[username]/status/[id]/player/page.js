import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, validParams } from "../../../../post-data.mjs";
import { previewVideo, videoPlaybackUrl } from "../../../../post-media.mjs";

export const metadata = { title: "Fxt video player", robots: { index: false, follow: false } };

export default async function PlayerPage({ params }) {
  const { username, id } = await params;
  if (!validParams(username, id)) notFound();
  const post = await getPost(username, id);
  const video = previewVideo(post);
  if (!video) notFound();
  return <main aria-label="Embedded video player" style={{ position: "fixed", inset: 0, background: "#000", display: "grid", placeItems: "center" }}>
    <video aria-label="Post video" controls playsInline autoPlay={video.gif} loop={video.gif} muted={video.gif} poster={video.poster || undefined} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain" }}>
      <source src={videoPlaybackUrl(video.url)} type={video.type} />
      Your browser does not support video playback.
    </video>
    <Link href={`/${username}/status/${id}`} target="_blank" rel="noreferrer" style={{ position: "absolute", top: 8, right: 8, padding: "6px 10px", borderRadius: 8, background: "#000b", color: "white", fontSize: 12 }}>Open post ↗</Link>
  </main>;
}
