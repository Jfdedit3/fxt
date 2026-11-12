import ImageGallery from "../ImageGallery";
import { T, LocalDate } from "../Language";
import Link from "next/link";
import AccountIdentity from "../AccountIdentity";
import { localPostUrl, postText, profilePath, safeExternalUrl, textValue } from "../post-info.mjs";
import { isGif, isVideo, mediaOf, mediaUrl, mediaMimeType, thumbnailUrl, gifDownloadUrl, videoDownloadUrl, videoPlaybackUrl } from "../post-media.mjs";
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
  const images = attachments.filter(item => !isVideo(item)).map(item => ({ url: safeExternalUrl(mediaUrl(item)), alt: textValue(item.altText) })).filter(item => item.url);
  return <article className="feedPost">
    {reposter && <p className="repostContext">↻ <Link href={reposter} prefetch={false}>{textValue(repost.name) || repost.screen_name}</Link> <T>reposted</T></p>}
    <AccountIdentity author={author}>
      <Link className="feedDate" href={href} aria-label="Open post">
        {validDate ? <span><LocalDate value={date.toISOString()} options={{ month: "short", day: "numeric", year: "numeric" }} /></span> : "Open post ↗"}
      </Link>
    </AccountIdentity>
    <PostContext post={post} />
    <Link className="feedText" href={href}><p className="postText">{postText(post) || <T>This post contains media.</T>}</p></Link>
    {attachments.slice(0, 4).map((item, index) => {
      const source = safeExternalUrl(mediaUrl(item));
      const poster = safeExternalUrl(thumbnailUrl(item));
      if (isVideo(item) && source && !mediaMimeType(item)) return <a className="detailLink" href={source} key={index} target="_blank" rel="noreferrer"><T>Open external video ↗</T></a>;
      if (isVideo(item) && source) return <div className="videoBlock" key={index}>
        <video className="postMedia feedMedia" controls playsInline autoPlay={isGif(item)} loop={isGif(item)} muted={isGif(item)} controlsList={isGif(item) ? "nodownload" : undefined} preload="none" poster={poster || undefined} src={videoPlaybackUrl(source)} />
        {isGif(item) ? gifDownloadUrl(source) && <a className="mediaDownload" href={gifDownloadUrl(source, `fxt-${post.id}-${index + 1}.gif`)} download><T>Download GIF ↓</T></a> : videoDownloadUrl(source) && <a className="mediaDownload" href={videoDownloadUrl(source, `fxt-${post.id}-${index + 1}.mp4`)} download><T>Download MP4 ↓</T></a>}
      </div>;
      return null;
    })}
    <ImageGallery images={images} />
    {post.quote && <Link className="quotedFeedLink" href={href}><T>Includes a quoted post →</T></Link>}
    <PostStatistics post={post} />
    <Link className="detailLink feedOpen" href={href}><T>Open full post →</T></Link>
  </article>;
}
