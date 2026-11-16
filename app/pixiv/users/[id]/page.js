import Link from "next/link";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getPixivUser } from "../../../pixiv-data.mjs";
import { validPixivId, pixivProxyUrl } from "../../../pixiv-url.mjs";
import { T } from "../../../Language";
import { siteOrigin } from "../../../site-url.mjs";
import CopyLinkButton from "../../../[username]/status/[id]/CopyLinkButton";
import ShareButton from "../../../ShareButton";
export const maxDuration = 15;
const load = cache(getPixivUser);
export async function generateMetadata({ params, searchParams }) {
  const { id } = await params, search = await searchParams, { user } = await load(id, search.artwork);
  if (!user) return { title: "Pixiv profile unavailable | Fxt", robots: { index: false }, openGraph: null, twitter: null };
  return { title: `${user.name} · Pixiv | Fxt`, description: user.bio.slice(0, 300), openGraph: { title: user.name, type: "profile", description: user.bio.slice(0, 300), ...(user.avatar ? { images: [`${siteOrigin()}${pixivProxyUrl(user.avatar)}`] } : {}) }, twitter: { card: "summary_large_image", title: user.name } };
}
export default async function Profile({ params, searchParams }) {
  const { id } = await params, search = await searchParams; if (!validPixivId(id)) notFound();
  const result = await load(id, search.artwork); if (result.state === "not-found") notFound(); if (!result.user) redirect(`/unavailable?return=${encodeURIComponent(`/pixiv/users/${id}`)}`);
  const user = result.user, path = `/pixiv/users/${id}${user.limited && validPixivId(search.artwork) ? `?artwork=${search.artwork}` : ""}`, url = `${siteOrigin()}${path}`;
  return <main className="profileShell"><nav className="profileNav"><Link href="/" className="profileBack">←</Link><strong>{user.name}</strong><Link className="brand profileBrand" href="/">fxt.</Link></nav><section className="profileCard"><div className="profileBanner profileBannerFallback" /><div className="profileSummary"><div className="profileTopRow">{user.avatar ? <img className="profileAvatar" src={pixivProxyUrl(user.avatar)} alt={user.name} /> : <span className="profileAvatar profileAvatarFallback">{user.name.slice(0, 1)}</span>}<a className="profileXLink" href={`https://www.pixiv.net/users/${id}`} target="_blank" rel="noreferrer"><T>View on Pixiv ↗</T></a></div><h1>{user.name}</h1>{user.bio && <p className="profileBio">{user.bio}</p>}{user.limited && <p className="detailMeta"><T>Pixiv limits access to this profile. Available public information is shown.</T></p>}<div className="postActions"><CopyLinkButton url={url} /><ShareButton url={url} title={user.name} /></div></div></section><section className="channelFeed">{user.artworks.map(art => <article className="channelEntry" key={art}><Link href={`/pixiv/artworks/${art}`} prefetch={false}><T>Artwork</T> #{art} →</Link></article>)}</section></main>;
}
