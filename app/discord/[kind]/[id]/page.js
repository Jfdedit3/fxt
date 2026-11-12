import Link from "next/link";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getDiscordProfile } from "../../../discord-data.mjs";
import { T, LocalNumber } from "../../../Language";
import { siteOrigin } from "../../../site-url.mjs";
import ShareButton from "../../../ShareButton";
import CopyLinkButton from "../../../[username]/status/[id]/CopyLinkButton";
export const maxDuration = 15;
const load = cache(getDiscordProfile);
export async function generateMetadata({ params }) {
  const { kind, id } = await params; const result = await load(kind, id);
  const item = result.item;
  if (!item) return { title: "Discord profile | Fxt", robots: { index: false }, openGraph: null, twitter: null };
  const title = `${item.name} · Discord`; const url = `${siteOrigin()}/discord/${kind}/${id}`;
  return { title, description: item.bio || title, alternates: { canonical: url }, openGraph: { title, description: item.bio || title, url, type: "profile", siteName: "Discord · Fxt", ...(item.avatar ? { images: [item.avatar] } : {}) }, twitter: { card: "summary_large_image", title, ...(item.avatar ? { images: [item.avatar] } : {}) } };
}
export default async function DiscordProfile({ params }) {
  const { kind, id } = await params; const result = await load(kind, id);
  if (result.state === "not-found") notFound();
  const original = kind === "invite" ? `https://discord.gg/${id}` : `https://discord.com/users/${id}`;
  if (result.state === "unavailable") redirect(`/unavailable?return=${encodeURIComponent(`/discord/${kind}/${id}`)}`);
  if (result.state === "restricted") return <main className="postShell"><section className="postCard"><h1><T>Discord profile</T></h1><p><T>This user’s profile is not available publicly.</T></p><p className="detailMeta">ID: {id}</p><a className="primaryLink" href={original} target="_blank" rel="noreferrer"><T>Open in Discord ↗</T></a><p className="detailMeta"><T>Public user details are available for Lanyard participants or through a configured Discord bot.</T></p><Link href="/"><T>Back to Fxt</T></Link></section></main>;
  const item = result.item; const url = `${siteOrigin()}/discord/${kind}/${id}`;
  return <main className="profileShell"><nav className="profileNav"><Link href="/" className="profileBack">←</Link><strong>{item.name}</strong><Link href="/" className="brand profileBrand">fxt.</Link></nav><section className="profileCard"><div className={`profileBanner${item.banner ? "" : " profileBannerFallback"}`}>{item.banner && <img src={item.banner} alt="" />}</div><div className="profileSummary"><div className="profileTopRow">{item.avatar ? <img className="profileAvatar" src={item.avatar} alt={item.name} /> : <span className="profileAvatar profileAvatarFallback">{item.name.slice(0, 1)}</span>}<a className="profileXLink" href={item.originalUrl} target="_blank" rel="noreferrer"><T>Open in Discord ↗</T></a></div><h1>{item.name}</h1>{item.username && <p className="profileHandle">@{item.username}</p>}{item.bio && <p className="profileBio">{item.bio}</p>}{item.badges?.length > 0 && <ul className="discordBadges">{item.badges.map(label => <li key={label}><T>{label}</T></li>)}</ul>}{item.status && <p className="discordPresence"><T>{({ online: "Online", offline: "Offline", idle: "Idle", dnd: "Do not disturb" })[item.status]}</T></p>}{item.activity && <p><T>Playing</T>: {item.activity}</p>}<dl className="profileStats">{item.members !== null && item.members !== undefined && <div><dd><LocalNumber value={item.members} /></dd><dt><T>Members</T></dt></div>}{item.online !== null && item.online !== undefined && <div><dd><LocalNumber value={item.online} /></dd><dt><T>Online</T></dt></div>}</dl><div className="postActions"><CopyLinkButton url={url} /><ShareButton url={url} title={item.name} /></div></div></section></main>;
}
