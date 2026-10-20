import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { countValue, formatCount, profileAvatarUrl, profilePath, safeExternalUrl, textValue } from "../post-info.mjs";
import { getProfile, getTimeline, profileOptions, profilePageUrl } from "../profile-data.mjs";
import FeedPost from "./FeedPost";

export const maxDuration = 60;

const loadProfile = cache((username, userId) => getProfile(username, undefined, userId));

export async function generateMetadata({ params, searchParams }) {
  const { username } = await params;
  if (!profilePath(username)) return { title: "Invalid profile | Fxt", robots: { index: false, follow: false } };
  const options = profileOptions(await searchParams);
  const { user } = await loadProfile(username, options.userId);
  if (!user) return { title: `@${username} | Fxt`, robots: { index: false, follow: false } };
  const title = `${textValue(user.name) || username} (@${user.screen_name}) | Fxt`;
  const description = (textValue(user.description) || `View @${user.screen_name}'s profile and public posts on Fxt.`).slice(0, 300);
  const image = safeExternalUrl(user.banner_url) || safeExternalUrl(user.avatar_url);
  return {
    title, description, alternates: { canonical: profilePath(user.screen_name) },
    openGraph: { title, description, type: "profile", siteName: "Fxt", url: profilePath(user.screen_name), ...(image ? { images: [{ url: image, alt: title }] } : {}) },
    twitter: { title, description, card: image ? "summary_large_image" : "summary", ...(image ? { images: [image] } : {}) }
  };
}

export default async function ProfilePage({ params, searchParams }) {
  const { username } = await params;
  if (!profilePath(username)) notFound();
  const options = profileOptions(await searchParams);
  const { state, user } = await loadProfile(username, options.userId);
  if (state === "not-found") notFound();
  if (!user) redirect(`/unavailable?return=${encodeURIComponent(profilePageUrl(username, options))}`);

  const timeline = user.protected ? { state: "protected", posts: [], nextCursor: null } : await getTimeline(user.screen_name, { ...options, userId: user.id });
  const name = textValue(user.name) || user.screen_name;
  const banner = safeExternalUrl(user.banner_url);
  const avatar = profileAvatarUrl(user.avatar_url);
  const website = safeExternalUrl(typeof user.website === "object" ? user.website?.url : user.website);
  const joined = new Date(user.joined);
  const verified = user.verification?.verified === true || user.verified === true;
  const stats = [["following", "Following"], ["followers", "Followers"], ["statuses", "Posts"], ["media_count", "Media"]].filter(([key]) => countValue(user[key]) !== null);
  const tabs = [["posts", "Posts"], ["replies", "Posts & replies"], ["media", "Media"]];

  return <main className="profileShell">
    <nav className="profileNav" aria-label="Profile navigation"><Link className="profileBack" href="/" aria-label="Back to Fxt home">←</Link><div><strong>{name}</strong><span>{formatCount(user.statuses) !== null ? `${formatCount(user.statuses)} posts` : `@${user.screen_name}`}</span></div><Link className="brand profileBrand" href="/">fxt<span className="brandDot">.</span></Link></nav>
    <section className="profileCard" aria-label={`@${user.screen_name}'s profile`}>
      <div className={`profileBanner${banner ? "" : " profileBannerFallback"}`}>{banner && <img src={banner} alt={`${name}'s profile banner`} />}</div>
      <div className="profileSummary">
        <div className="profileTopRow">
          {avatar ? <img className="profileAvatar" src={avatar} alt={`${name}'s profile photo`} /> : <div className="profileAvatar profileAvatarFallback">{name.slice(0, 1).toUpperCase()}</div>}
          <a className="profileXLink" href={`https://x.com/${user.screen_name}`} target="_blank" rel="noreferrer">View on X ↗</a>
        </div>
        <h1>{name}{verified && <span className="verifiedBadge" title="Verified on X" aria-label="Verified on X"> ✓</span>}{user.protected && <span className="protectedBadge">Protected</span>}</h1>
        <p className="profileHandle">@{user.screen_name}</p>
        {textValue(user.description) && <p className="profileBio">{user.description}</p>}
        <ul className="profileFacts">
          {textValue(user.location) && <li>⌖ {user.location}</li>}
          {website && <li><a href={website} target="_blank" rel="noreferrer">↗ {textValue(user.website?.display_url) || new URL(website).hostname}</a></li>}
          {!Number.isNaN(joined.getTime()) && <li>Joined {new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(joined)}</li>}
        </ul>
        <dl className="profileStats">{stats.map(([key, label]) => <div key={key}><dd>{formatCount(user[key])}</dd><dt>{label}</dt></div>)}</dl>
      </div>
      <nav className="profileTabs" aria-label="Profile feeds">{tabs.map(([tab, label]) => <Link key={tab} href={profilePageUrl(user.screen_name, { tab, userId: options.userId })} prefetch={false} aria-current={options.tab === tab ? "page" : undefined}>{label}</Link>)}</nav>
    </section>
    <section className="profileTimeline" aria-label={tabs.find(([tab]) => tab === options.tab)[1]}>
      {timeline.posts.map(post => <FeedPost key={post.id} post={post} />)}
      {timeline.state === "protected" && <div className="profileEmpty"><h2>These posts are protected</h2><p>Only approved followers can view this account’s posts on X.</p></div>}
      {timeline.state === "unavailable" && <div className="profileEmpty"><h2>Posts temporarily unavailable</h2><p>The profile loaded, but its posts couldn’t be retrieved. Try again later.</p><Link href={profilePageUrl(user.screen_name, { tab: options.tab, userId: options.userId })} prefetch={false}>Try again →</Link></div>}
      {timeline.state === "empty" && <div className="profileEmpty"><h2>{options.cursor ? "No more posts to show" : "No posts to show"}</h2><p>No public posts were returned for this feed.</p></div>}
      <div className="profilePagination">
        {options.cursor && <Link href={profilePageUrl(user.screen_name, { tab: options.tab, userId: options.userId })} prefetch={false}>↑ Latest posts</Link>}
        {timeline.nextCursor && <Link href={profilePageUrl(user.screen_name, { tab: options.tab, userId: options.userId, cursor: timeline.nextCursor })} prefetch={false}>Load older posts ↓</Link>}
      </div>
    </section>
    <p className="privacyNote">Public profile data provided by FxTwitter. Information may be cached for up to 60 seconds.</p>
  </main>;
}
