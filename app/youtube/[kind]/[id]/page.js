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
  return { title: `${item.title} | Fxt`, description: item.text.slice(0, 300), alternates: { canonical: url }, openGraph: { title: item.title, description: `${item.author}\n${item.text}`.slice(0, 300), url, type: "article", images: item.images, siteName: "YouTube · Fxt" }, twitter: { card: "summary_large_image", title: item.title, images: item.images } };
}
export default async function YouTubePage({ params }) {
  const { kind, id } = await params;
  const result = await load(kind, id);
  if (result.state === "not-found") notFound();
  if (!result.item) redirect(`/unavailable?return=${encodeURIComponent(`/youtube/${kind}/${id}`)}`);
  const item = result.item;
  return <main className="postShell"><nav className="postNav"><Link className="brand" href="/">fxt<span className="brandDot">.</span></Link><a className="plainLink" href={item.originalUrl} target="_blank" rel="noreferrer">Original on YouTube ↗</a></nav><article className="postCard"><div className="postBadge">YOUTUBE {kind === "post" ? "COMMUNITY POST" : kind.toUpperCase()}</div><h1>{kind === "post" ? item.author : item.title}</h1>{kind !== "post" && <p className="timestamp">{item.author}</p>}{item.videoId && <iframe className="youtubePlayer" title={item.title} src={`https://www.youtube-nocookie.com/embed/${item.videoId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}<p className="postText">{item.text}</p>{kind === "post" && item.images.map((image, index) => <a href={image} key={image} target="_blank" rel="noreferrer"><img className="postMedia" src={image} alt={`Post image ${index + 1}`} loading="lazy" /></a>)}{item.published && <p className="timestamp">{item.published}</p>}{item.views && <p className="timestamp">{Number(item.views).toLocaleString("en-US")} views</p>}{item.likes && <p className="timestamp">{item.likes} likes</p>}<div className="postActions"><a href={item.originalUrl} target="_blank" rel="noreferrer">View on YouTube ↗</a><CopyLinkButton url={`${origin()}/youtube/${kind}/${id}`} /></div></article></main>;
}
