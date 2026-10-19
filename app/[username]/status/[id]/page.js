import Link from "next/link";
import { notFound } from "next/navigation";
import CopyLinkButton from "./CopyLinkButton";
import AccountIdentity from "../../../AccountIdentity";
import { mediaOf, mediaUrl, isVideo, thumbnailUrl, previewImage, videoPlaybackUrl } from "../../../post-media.mjs";
import PostDetails, { AuthorDetails, PostContext, PostStatistics } from "./PostDetails";
import { metadataDescription, postText, safeExternalUrl } from "../../../post-info.mjs";

const API_BASE = "https://api.fxtwitter.com";
const USERNAME_RE = /^[a-zA-Z0-9_]{1,50}$/;
const STATUS_ID_RE = /^\d{1,30}$/;

function validParams(username, id) {
  return USERNAME_RE.test(username) && STATUS_ID_RE.test(id);
}

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {}
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

async function getPost(username, id) {
  if (!validParams(username, id)) return null;

  // Prefer FxTwitter API v2: its status.media.all represents the complete
  // attachment list. Fall back to the legacy endpoint if v2 is unavailable.
  const endpoints = [
    `${API_BASE}/2/status/${encodeURIComponent(id)}`,
    `${API_BASE}/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          // FxTwitter API v2 rejects requests without an identifiable User-Agent.
          "User-Agent": "FxtPreview/1.0 (+https://fxt-pi.vercel.app)"
        },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 60 }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const post =
        data?.status ||
        data?.tweet ||
        data?.data?.status ||
        data?.data?.tweet ||
        data?.data ||
        null;

      if (post && typeof post === "object" && post.media && typeof post.media === "object") {
        return post;
      }
      if (post && typeof post === "object") return post;
    } catch {
      // Try the next compatible endpoint.
    }
  }

  return null;
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

  const post = await getPost(username, id);
  const title = post ? `${authorName(post)} (@${authorHandle(post, username)}) on X` : "X post preview";
  const description = metadataDescription(post, username);
  const image = previewImage(post);
  const video = mediaOf(post).find(isVideo);
  const videoUrl = safeExternalUrl(mediaUrl(video));
  const canonical = `${siteOrigin()}/${encodeURIComponent(username)}/status/${id}`;

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
      ...(videoUrl ? { videos: [{ url: videoUrl, type: video?.content_type || "video/mp4" }] } : {})
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {})
    }
  };
}

export default async function PostPage({ params }) {
  const { username, id } = await params;
  if (!validParams(username, id)) notFound();

  const post = await getPost(username, id);
  const originalUrl = `https://x.com/${encodeURIComponent(username)}/status/${id}`;
  const currentUrl = `${siteOrigin()}/${encodeURIComponent(username)}/status/${id}`;

  if (!post) {
    return (
      <main className="postShell">
        <Link href="/" className="back">← Fxt</Link>
        <section className="postCard">
          <div className="postBadge">POST UNAVAILABLE</div>
          <h1>We couldn’t load this post.</h1>
          <p>The post may be private, deleted, restricted, or temporarily unavailable from the upstream source.</p>
          <a className="primaryLink" href={originalUrl} target="_blank" rel="noreferrer">Open on X ↗</a>
          <p className="smallNote">Try again later if the post should be public.</p>
        </section>
      </main>
    );
  }

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
          if (isVideo(item) && playbackSource) {
            return (
              <video className="postMedia" key={index} controls playsInline preload="metadata" poster={poster || undefined}>
                <source src={playbackSource} type={item.content_type || "video/mp4"} />
                Your browser does not support embedded video.
              </video>
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
