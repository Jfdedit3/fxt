import Link from "next/link";
import AccountIdentity from "../AccountIdentity";
import { localPostUrl, postText, profilePath, safeExternalUrl, textValue } from "../post-info.mjs";
import { isGif, isVideo, mediaOf, mediaUrl, thumbnailUrl, videoPlaybackUrl } from "../post-media.mjs";
import { PostContext, PostStatistics } from "./status/[id]/PostDetails";

export default function FeedPost({ post }) {
  const href = localPostUrl(post);
  if (!href) return null;
  const author = post.author || post.user || {};
  const repost = post.reposted_by;
  const reposter = profilePath(repost?.screen_name);
  const date = new Date(post.created_at);
  const validDate = !Number.isNaN(date.getTime());
  const attachments = mediaOf(post);
  return <article className="feedPost">
    {reposter && <p className="repostContext">↻ <Link href={reposter} prefetch={false}>{textValue(repost.name) || repost.screen_name}</Link> reposted</p>}
    <AccountIdentity author={author}>
      <Link className="feedDate" href={href} aria-label="Open post">
        {validDate ? <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)}</time> : "Open post ↗"}
      </Link>
    </AccountIdentity>
    <PostContext post={post} />
    <Link className="feedText" href={href}><p className="postText">{postText(post) || "This post contains media."}</p></Link>
    {attachments.slice(0, 4).map((item, index) => {
      const source = safeExternalUrl(mediaUrl(item));
      const poster = safeExternalUrl(thumbnailUrl(item));
      if (isVideo(item) && source) return <video key={index} className="postMedia feedMedia" controls playsInline autoPlay={isGif(item)} loop={isGif(item)} muted={isGif(item)} preload="none" poster={poster || undefined} src={videoPlaybackUrl(source)} />;
      const image = source || poster;
      return image ? <Link href={href} key={index} className="feedMediaLink"><img src={image} alt={textValue(item.altText) || `Media ${index + 1} from post`} className="postMedia feedMedia" loading="lazy" /></Link> : null;
    })}
    {post.quote && <Link className="quotedFeedLink" href={href}>Includes a quoted post →</Link>}
    <PostStatistics post={post} />
    <Link className="detailLink feedOpen" href={href}>Open full post →</Link>
  </article>;
}
