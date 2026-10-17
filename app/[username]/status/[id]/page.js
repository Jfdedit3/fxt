import Link from "next/link";
import { notFound } from "next/navigation";

const API_BASE = "https://api.fxtwitter.com";

async function getPost(username, id) {
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`, {
      headers: { "Accept": "application/json", "User-Agent": "FxtEmbed/1.0" },
      next: { revalidate: 60 }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.tweet || data?.data?.tweet || data?.data || null;
  } catch { return null; }
}

function mediaOf(post) {
  const media = post?.media?.all || post?.media?.videos || post?.media?.photos || [];
  return Array.isArray(media) ? media : [];
}
function postText(post) {
  return String(post?.text || post?.raw_text || post?.description || "").trim();
}
function authorName(post) {
  return post?.author?.name || post?.author?.screen_name || post?.user?.name || "X user";
}
function authorHandle(post, username) {
  return post?.author?.screen_name || post?.user?.screen_name || username;
}
function firstImage(post) {
  const media = mediaOf(post);
  const item = media.find(m => m?.url || m?.thumbnail_url || m?.thumbnail);
  return item?.thumbnail_url || item?.thumbnail || item?.url || post?.media?.photos?.[0]?.url || null;
}

export async function generateMetadata({ params }) {
  const { username, id } = await params;
  const post = await getPost(username, id);
  const text = postText(post);
  const title = post ? `${authorName(post)} (@${authorHandle(post, username)}) on X` : "X post preview";
  const description = (text || `View the original post by @${username} on X.`).slice(0, 300);
  const image = firstImage(post);
  const video = mediaOf(post).find(m => String(m.type || "").toLowerCase().includes("video"));
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://fxt.vercel.app").replace(/\/$/, "");
  const metadata = {
    title, description, alternates: { canonical: `${site}/${encodeURIComponent(username)}/status/${id}` },
    openGraph: { type: "article", title, description, siteName: "Fxt", url: `${site}/${encodeURIComponent(username)}/status/${id}`, ...(image ? { images: [{ url: image, alt: title }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) }
  };
  if (video?.url) {
    metadata.openGraph.videos = [{ url: video.url, type: video.content_type || "video/mp4" }];
    metadata.openGraph.type = "video.other";
  }
  return metadata;
}

export default async function PostPage({ params }) {
  const { username, id } = await params;
  if (!/^\d+$/.test(id) || !/^[a-zA-Z0-9_]{1,50}$/.test(username)) notFound();
  const post = await getPost(username, id);
  const text = postText(post);
  const media = mediaOf(post);
  const originalUrl = `https://x.com/${encodeURIComponent(username)}/status/${id}`;
  if (!post) return <main className="postShell"><Link href="/" className="back">← Fxt</Link><section className="postCard"><div className="postBadge">POST UNAVAILABLE</div><h1>We couldn't load this post.</h1><p>The post may be private, deleted, restricted, or temporarily unavailable from the upstream source.</p><a className="primaryLink" href={originalUrl} target="_blank" rel="noreferrer">Open on X ↗</a><p className="smallNote">Try again later if the post should be public.</p></section></main>;
  const author = post.author || post.user || {};
  const avatar = author.avatar_url || author.avatar || author.profile_image_url;
  return <main className="postShell">
    <nav className="postNav"><Link className="brand" href="/"><span className="brandMark">f</span> fxt<span className="brandDot">.</span></Link><a className="plainLink" href={originalUrl} target="_blank" rel="noreferrer">Original post ↗</a></nav>
    <article className="postCard">
      <div className="postBadge"><span className="pulse" /> X POST PREVIEW</div>
      <header className="author">
        {avatar ? <img src={avatar} alt="" className="avatar" /> : <div className="avatar avatarFallback">{authorName(post).slice(0,1).toUpperCase()}</div>}
        <div><strong>{authorName(post)}</strong><span>@{authorHandle(post, username)}</span></div>
        <a className="xIcon" href={originalUrl} target="_blank" rel="noreferrer" aria-label="Open original post">𝕏</a>
      </header>
      <p className="postText">{text || "This post contains media."}</p>
      {media.map((item, index) => {
        const type = String(item.type || "").toLowerCase();
        const src = item.url || item.media_url || item.thumbnail_url || item.thumbnail;
        if (!src) return null;
        if (type.includes("video") && item.url) return <video className="postMedia" key={index} controls playsInline preload="metadata" poster={item.thumbnail_url || item.thumbnail}><source src={item.url} type={item.content_type || "video/mp4"} /></video>;
        return <a key={index} href={src} target="_blank" rel="noreferrer"><img className="postMedia" src={src} alt={`Media ${index + 1} from post`} loading="lazy" /></a>;
      })}
      {post.created_at && <p className="timestamp">{post.created_at}</p>}
      <div className="postActions"><a href={originalUrl} target="_blank" rel="noreferrer">View on X ↗</a><button onClick={undefined} className="copyHint">Copy this URL from your browser</button></div>
    </article>
    <p className="privacyNote">Fxt fetches post details on demand. Availability depends on the upstream source and the visibility of the post.</p>
  </main>;
}
