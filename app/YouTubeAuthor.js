import Link from "next/link";
import { channelPath } from "./youtube-channel-url.mjs";
import { T } from "./Language";
export default function YouTubeAuthor({ item }) {
  const path = channelPath(item.channelId || item.channelRef);
  const content = <>{item.avatar && <img className="avatar" src={item.avatar} alt="" />}<span><strong>{item.author}</strong><span className="detailMeta"><T>Channel</T></span></span></>;
  return path ? <Link className="youtubeAuthor" href={path} prefetch={false}>{content}</Link> : <div className="youtubeAuthor">{content}</div>;
}
