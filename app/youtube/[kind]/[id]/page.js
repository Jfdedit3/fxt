import { youtubeDescription } from "../../../youtube-preview.mjs";
import { T, LocalDate, LocalNumber } from "../../../Language";
import { durationLabel } from "../../../i18n.mjs";
import ImageGallery from "../../../ImageGallery";
import ShareButton from "../../../ShareButton";
import PreviewStatus from "../../../PreviewStatus";
import Link from "next/link";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getYouTubeResult } from "../../../youtube-data.mjs";
import CopyLinkButton from "../../../[username]/status/[id]/CopyLinkButton";

export const maxDuration = 15;
const load = cache(getYouTubeResult);
const origin = () => process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
export async function generateMetadata({ params }) {
  const { kind, id } = await params;
  const { item } = await load(kind, id);
  if (!item) return { title: "YouTube content unavailable | Fxt", robots: { index: false }, openGraph: null, twitter: null };
  const url = `${origin()}/youtube/${kind}/${id}`;
  return { title: `${item.title} | Fxt`, description: youtubeDescription(item), alternates: { canonical: url }, openGraph: { title: item.title, description: youtubeDescription(item), url, type: "article", images: item.images, siteName: "YouTube · Fxt" }, twitter: { card: "summary_large_image", title: item.title, images: item.images } };
}
export default async function YouTubePage({ params }) {
  const { kind, id } = await params;
  const result = await load(kind, id);
  if (result.state === "not-found") notFound();
  if (!result.item) redirect(`/unavailable?return=${encodeURIComponent(`/youtube/${kind}/${id}`)}`);
  const item = result.item;
  return <main className="postShell"><nav className="postNav"><Link className="brand" href="/">fxt<span className="brandDot">.</span></Link><a className="plainLink" href={item.originalUrl} target="_blank" rel="noreferrer"><T>Original on YouTube ↗</T></a></nav><article className="postCard"><div className="postBadge">YOUTUBE <T>{kind === "post" ? "COMMUNITY POST" : kind.toUpperCase()}</T></div><h1>{kind === "post" ? item.author : item.title}</h1>{kind !== "post" && <p className="timestamp">{item.author}</p>}{item.videoId && <iframe className="youtubePlayer" title={item.title} src={`https://www.youtube-nocookie.com/embed/${item.videoId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}<p className="postText">{item.text}</p>{kind === "post" && <ImageGallery images={item.images.map(url => ({ url }))} />}{item.published && <p className="timestamp"><T>Published</T>: {/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(item.published) ? <LocalDate value={item.published} options={{ dateStyle: "long" }} /> : item.published}</p>}{item.views && <p className="timestamp"><LocalNumber value={Number(item.views)} /> <T>views</T></p>}{item.likes && <p className="timestamp">{item.likes} <T>likes</T></p>}{durationLabel(item.duration) && <p className="timestamp"><T>Duration</T>: {durationLabel(item.duration)}</p>}{item.channelId && <a className="detailLink" href={`https://www.youtube.com/channel/${item.channelId}`} target="_blank" rel="noreferrer"><T>View channel ↗</T></a>}<PreviewStatus stale={result.stale} /><div className="postActions"><a href={item.originalUrl} target="_blank" rel="noreferrer"><T>View on YouTube ↗</T></a><CopyLinkButton url={`${origin()}/youtube/${kind}/${id}`} /><ShareButton title={item.title} url={`${origin()}/youtube/${kind}/${id}`} /></div></article></main>;
}
