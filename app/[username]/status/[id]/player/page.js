import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPostResult, validParams } from "../../../../post-data.mjs";
import { previewVideo, gifDownloadUrl, videoDownloadUrl, videoPlaybackUrl } from "../../../../post-media.mjs";

export const maxDuration = 60;

export const metadata = { title: "Fxt video player", robots: { index: false, follow: false } };

export default async function PlayerPage({ params }) {
  const { username, id } = await params;
  if (!validParams(username, id)) notFound();
  const result = await getPostResult(username, id);
  if (result.state === "not-found") notFound();
  if (!result.post) redirect(`/unavailable?return=${encodeURIComponent(`/${username}/status/${id}/player`)}`);
  const post = result.post;
  const video = previewVideo(post);
  if (!video) notFound();
  const download = video.gif ? gifDownloadUrl(video.url, `fxt-${username}-${id}.gif`) : videoDownloadUrl(video.url, `fxt-${username}-${id}.mp4`);
  return <main aria-label="Embedded video player" style={{ position: "fixed", inset: 0, background: "#000", display: "grid", placeItems: "center" }}>
    <video aria-label="Post video" controls playsInline autoPlay={video.gif} loop={video.gif} muted={video.gif} controlsList={video.gif ? "nodownload" : undefined} poster={video.poster || undefined} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain" }}>
      <source src={videoPlaybackUrl(video.url)} type={video.type} />
      Your browser does not support video playback.
    </video>
    {download && <a href={download} download style={{ position: "absolute", top: 8, left: 8, padding: "6px 10px", borderRadius: 8, background: "#000b", color: "white", fontSize: 12 }}>Download {video.gif ? "GIF" : "MP4"} ↓</a>}
    <Link href={`/${username}/status/${id}`} target="_blank" rel="noreferrer" style={{ position: "absolute", top: 8, right: 8, padding: "6px 10px", borderRadius: 8, background: "#000b", color: "white", fontSize: 12 }}>Open post ↗</Link>
  </main>;
}
