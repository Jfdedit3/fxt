import Link from "next/link";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import CopyLinkButton from "./CopyLinkButton";
import AccountIdentity from "../../../AccountIdentity";
import { getPostResult, validParams } from "../../../post-data.mjs";
import { mediaOf, mediaUrl, mediaMimeType, isGif, isVideo, thumbnailUrl, previewImage, previewVideo, gifDownloadUrl, videoDownloadUrl, videoPlaybackUrl } from "../../../post-media.mjs";
import PostDetails, { AuthorDetails, PostContext, PostStatistics } from "./PostDetails";
import { metadataDescription, postText, safeExternalUrl } from "../../../post-info.mjs";

export const maxDuration = 60;
const loadPost = cache(getPostResult);

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch { /* Fall back to the default URL. */ }
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

function authorName(post) {
  return post?.author?.name || post?.author?.screen_name || post?.user?.name || "X user";
}

function authorHandle(post, username) {
  return post?.author?.screen_name || post?.user?.screen_name || username;
}

function displayDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(date) + " UTC";
}

export async function generateMetadata({ params }) {
  const { username, id } = await params;
  if (!validParams(username, id)) {
    return { title: "Invalid post URL | Fxt", robots: { index: false, follow: false } };
  }

  const result = await loadPost(username, id);
  const post = result.post;
  if (!post) return { title: "Post unavailable | Fxt", robots: { index: false, follow: false }, openGraph: null, twitter: null };
  const title = post ? `${authorName(post)} (@${authorHandle(post, username)}) on X` : "X post preview";
  const description = metadataDescription(post, username);
  const image = previewImage(post);
  const video = previewVideo(post);
  const videoUrl = video?.url;
  const canonical = `${siteOrigin()}/${encodeURIComponent(authorHandle(post, username))}/status/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: videoUrl ? "video.other" : "article",
      title,
      description,
      siteName: "Fxt",
      url: canonical,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
      ...(videoUrl ? { videos: [{ url: videoUrl, secureUrl: videoUrl.startsWith("https:") ? videoUrl : undefined, type: video.type, width: video.width, height: video.height }] } : {})
    },
    ...(videoUrl ? { other: { "twitter:player:stream:content_type": video.type } } : {}),
    twitter: {
      card: videoUrl ? "player" : image ? "summary_large_image" : "summary",
      ...(videoUrl ? { players: [{ playerUrl: `${canonical}/player`, streamUrl: videoUrl, width: video.width, height: video.height }] } : {}),
      title,
      description,
      ...(image ? { images: [image] } : {})
    }
  };
}

export default async function PostPage({ params }) {
  const { username, id } = await params;
  if (!validParams(username, id)) notFound();

  const result = await loadPost(username, id);
  const post = result.post;
  if (result.state === "not-found") notFound();
  if (!post) redirect(`/unavailable?return=${encodeURIComponent(`/${username}/status/${id}`)}`);
  const handle = authorHandle(post, username);
  const originalUrl = `https://x.com/${handle}/status/${id}`;
  const currentUrl = `${siteOrigin()}/${handle}/status/${id}`;

  const author = post.author || post.user || {};
  const date = displayDate(post.created_at || post.date);
  const media = mediaOf(post);

  return (
    <main className="postShell">
      <nav className="postNav">
        <Link className="brand" href="/"><span className="brandMark">f</span> fxt<span className="brandDot">.</span></Link>
        <a className="plainLink" href={originalUrl} target="_blank" rel="noreferrer">Original post ↗</a>
      </nav>
      <article className="postCard">
        <div className="postBadge"><span className="pulse" /> X POST PREVIEW</div>
        <AccountIdentity author={author} fallbackHandle={username}>
          <a className="xIcon" href={originalUrl} target="_blank" rel="noreferrer" aria-label="Open original post">𝕏</a>
        </AccountIdentity>
        <AuthorDetails author={author} />
        <PostContext post={post} />
        <p className="postText">{postText(post) || "This post contains media."}</p>
        {media.map((item, index) => {
          const source = safeExternalUrl(mediaUrl(item));
          const playbackSource = isVideo(item) && source ? videoPlaybackUrl(source) : source;
          const poster = safeExternalUrl(thumbnailUrl(item));
          if (!source && !poster) return null;
          if (isVideo(item) && source && !mediaMimeType(item)) return <a className="detailLink" key={index} href={source} target="_blank" rel="noreferrer">Open external video ↗</a>;
          if (isVideo(item) && playbackSource) {
            return (
              <div className="videoBlock" key={index}>
                <video className="postMedia" controls playsInline autoPlay={isGif(item)} loop={isGif(item)} muted={isGif(item)} controlsList={isGif(item) ? "nodownload" : undefined} preload="metadata" poster={poster || undefined}>
                  <source src={playbackSource} type={mediaMimeType(item)} />
                  Your browser does not support embedded video.
                </video>
                {isGif(item) ? gifDownloadUrl(source) && <a className="mediaDownload" href={gifDownloadUrl(source, `fxt-${username}-${id}-${index + 1}.gif`)} download>Download GIF ↓</a> : videoDownloadUrl(source) && <a className="mediaDownload" href={videoDownloadUrl(source, `fxt-${username}-${id}-${index + 1}.mp4`)} download>Download MP4 ↓</a>}
              </div>
            );
          }
          const image = source || poster;
          return (
            <a key={index} href={image} target="_blank" rel="noreferrer">
              <img className="postMedia" src={image} alt={typeof item.altText === "string" && item.altText.trim() ? item.altText : `Media ${index + 1} from post`} loading="lazy" />
            </a>
          );
        })}
        <PostDetails post={post} />
        {date && <p className="timestamp">{date}</p>}
        <PostStatistics post={post} />
        <div className="postActions">
          <a href={originalUrl} target="_blank" rel="noreferrer">View on X ↗</a>
          <CopyLinkButton url={currentUrl} />
        </div>
      </article>
      <p className="privacyNote">Post details and counts may be cached for up to 60 seconds. Availability depends on the upstream source and the visibility of the post.</p>
    </main>
  );
}
