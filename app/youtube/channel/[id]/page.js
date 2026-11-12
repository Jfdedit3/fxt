import ChannelFeed from "../../../ChannelFeed";
import Link from "next/link";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getYouTubeChannel } from "../../../youtube-channel-data.mjs";
import { channelPath, channelTab, validChannelRef, decodeChannelRef } from "../../../youtube-channel-url.mjs";
import { siteOrigin } from "../../../site-url.mjs";
import { T, SourceLabel } from "../../../Language";
import ShareButton from "../../../ShareButton";
import CopyLinkButton from "../../../[username]/status/[id]/CopyLinkButton";
import PreviewStatus from "../../../PreviewStatus";
export const maxDuration = 15;
const load = cache(getYouTubeChannel);
export async function generateMetadata({ params, searchParams }) {
  const { id: encodedId } = await params; const id = decodeChannelRef(encodedId); const tab = channelTab((await searchParams).tab);
  const { channel } = await load(id, tab);
  if (!channel) return { title: "YouTube channel unavailable | Fxt", robots: { index: false }, openGraph: null, twitter: null };
  const url = `${siteOrigin()}${channelPath(channel.id)}`;
  const image = channel.avatar || channel.banner;
  return { title: `${channel.name} | Fxt`, description: channel.description.slice(0, 300), alternates: { canonical: url }, openGraph: { title: channel.name, description: channel.description.slice(0, 300), type: "profile", url, siteName: "YouTube · Fxt", ...(image ? { images: [image] } : {}) }, twitter: { card: "summary_large_image", title: channel.name, ...(image ? { images: [image] } : {}) } };
}
export default async function YouTubeChannel({ params, searchParams }) {
  const { id: encodedId } = await params; const id = decodeChannelRef(encodedId); if (!validChannelRef(id)) notFound();
  const tab = channelTab((await searchParams).tab); const result = await load(id, tab);
  if (result.state === "not-found") notFound();
  if (!result.channel) redirect(`/unavailable?return=${encodeURIComponent(channelPath(id, tab))}`);
  const { channel, entries } = result;
  const url = `${siteOrigin()}${channelPath(channel.id, tab)}`;
  return <main className="profileShell"><nav className="profileNav"><Link href="/" className="profileBack">←</Link><strong>{channel.name}</strong><Link className="brand profileBrand" href="/">fxt.</Link></nav><section className="profileCard"><div className={`profileBanner${channel.banner ? "" : " profileBannerFallback"}`}>{channel.banner && <img src={channel.banner} alt="" />}</div><div className="profileSummary"><div className="profileTopRow">{channel.avatar ? <img className="profileAvatar" src={channel.avatar} alt={channel.name} /> : <span className="profileAvatar profileAvatarFallback">{channel.name.slice(0, 1)}</span>}<a className="profileXLink" href={channel.originalUrl} target="_blank" rel="noreferrer"><T>View on YouTube ↗</T></a></div><h1>{channel.name}</h1>{channel.handle && <p className="profileHandle">{channel.handle}</p>}{channel.description && <p className="profileBio">{channel.description}</p>}<div className="channelCounts">{channel.subscribers && <span><SourceLabel>{channel.subscribers}</SourceLabel></span>}{channel.videoCount && <span><SourceLabel>{channel.videoCount}</SourceLabel></span>}</div><div className="postActions"><CopyLinkButton url={url} /><ShareButton url={url} title={channel.name} /></div></div><nav className="profileTabs">{[["videos", "Videos"], ["shorts", "Shorts"], ["posts", "Community posts"]].map(([value, label]) => <Link key={value} href={channelPath(channel.id, value)} prefetch={false} aria-current={tab === value ? "page" : undefined}><T>{label}</T></Link>)}</nav></section><ChannelFeed key={`${channel.id}:${tab}`} initialEntries={entries} initialCursor={result.cursor} channelName={channel.name} />{result.feedState !== "ready" && <div className="profileEmpty"><h2><T>{result.feedState === "empty" ? "No public content in this tab" : "Channel content temporarily unavailable"}</T></h2></div>}<p className="privacyNote"><T>Showing the latest public content returned by YouTube.</T> <a href={channel.originalUrl} target="_blank" rel="noreferrer"><T>More on YouTube ↗</T></a></p><PreviewStatus stale={result.stale} /></main>;
}
