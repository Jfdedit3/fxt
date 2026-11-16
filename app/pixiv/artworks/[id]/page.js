import Link from "next/link";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getPixivArtwork } from "../../../pixiv-data.mjs";
import { pixivProxyUrl } from "../../../pixiv-url.mjs";
import { pixivPanels, pixivPanelUrl } from "../../../pixiv-preview.mjs";
import { siteOrigin } from "../../../site-url.mjs";
import { T, LocalDate, LocalNumber } from "../../../Language";
import PostGallery from "../../../PostGallery";
import ShareButton from "../../../ShareButton";
import CopyLinkButton from "../../../[username]/status/[id]/CopyLinkButton";
export const maxDuration = 15;
const load = cache(getPixivArtwork);
export async function generateMetadata({ params }) {
  const { id } = await params, { item } = await load(id);
  if (!item) return { title: "Pixiv artwork unavailable | Fxt", robots: { index: false }, openGraph: null, twitter: null };
  const image = `${siteOrigin()}${pixivProxyUrl(item.images[0].regular)}`;
  return { title: `${item.title} | Fxt`, description: item.description.slice(0, 300), alternates: { canonical: `/pixiv/artworks/${id}` }, openGraph: { type: "article", title: item.title, description: `${item.author}\n${item.description}`.slice(0, 300), images: [image], url: `${siteOrigin()}/pixiv/artworks/${id}`, siteName: "Pixiv · Fxt" }, twitter: { card: "summary_large_image", title: item.title, images: [image] } };
}
export default async function Artwork({ params }) {
  const { id } = await params, result = await load(id); if (result.state === "not-found") notFound(); if (!result.item) redirect(`/unavailable?return=${encodeURIComponent(`/pixiv/artworks/${id}`)}`);
  const item = result.item, url = `${siteOrigin()}/pixiv/artworks/${id}`, original = `https://www.pixiv.net/artworks/${id}`;
  const images = item.images.map((image, index) => ({ url: pixivProxyUrl(image.regular), originalUrl: pixivProxyUrl(image.original), downloadUrl: pixivProxyUrl(image.original, { download: true }), alt: `${item.title} · ${index + 1}` }));
  const panels = pixivPanels(item).map((panel, index) => ({ url: pixivPanelUrl(id, index), alt: `Images ${panel.first}–${panel.last} / ${item.images.length}` }));
  return <main className="postShell"><nav className="postNav"><Link className="brand" href="/">fxt.</Link><a className="plainLink" href={original} target="_blank" rel="noreferrer"><T>View on Pixiv ↗</T></a></nav><article className="postCard"><div className="postBadge">PIXIV</div><h1>{item.title}</h1><Link className="youtubeAuthor" href={`/pixiv/users/${item.authorId}?artwork=${id}`} prefetch={false}>{item.avatar && <img className="avatar" src={pixivProxyUrl(item.avatar)} alt="" />}<strong>{item.author}</strong></Link>{item.sensitive && <p className="sensitiveNotice"><T>This post may contain sensitive media.</T></p>}<p className="postText">{item.description}</p>{!item.complete && <p className="detailMeta"><T>Only the images available from the public source are shown.</T></p>}{item.animation && <p className="detailMeta"><T>Open Pixiv to play this animation.</T></p>}<PostGallery key={id} images={images} panels={panels} />{item.created && <p className="timestamp"><LocalDate value={item.created} options={{ dateStyle: "long" }} /></p>}<dl className="postStats">{[["views","Views"],["likes","Likes"],["bookmarks","Bookmarks"]].filter(([key]) => item[key] !== null).map(([key,label]) => <div key={key}><dt><T>{label}</T></dt><dd><LocalNumber value={item[key]} /></dd></div>)}</dl>{item.tags.length > 0 && <p className="detailMeta">{item.tags.map(tag => `#${tag}`).join(" ")}</p>}{item.source === "phixiv" && <p className="detailMeta"><T>Preview images provided by Phixiv. Open Pixiv for original quality.</T></p>}<div className="postActions"><a href={original} target="_blank" rel="noreferrer"><T>View on Pixiv ↗</T></a><CopyLinkButton url={url} /><ShareButton url={url} title={item.title} /></div></article></main>;
}
