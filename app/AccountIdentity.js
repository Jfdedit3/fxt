import Link from "next/link";
import { profilePath, safeExternalUrl, textValue } from "./post-info.mjs";

export default function AccountIdentity({ author = {}, fallbackHandle = "", children }) {
  const handle = textValue(author.screen_name) || fallbackHandle;
  const name = textValue(author.name) || handle || "X user";
  const base = profilePath(handle);
  const href = base && /^\d{1,30}$/.test(String(author.id || "")) ? `${base}?user_id=${author.id}` : base;
  const avatar = safeExternalUrl(author.avatar_url || author.avatar || author.profile_image_url);
  const image = avatar ? <img src={avatar} alt="" className="avatar" loading="lazy" /> : <span className="avatar avatarFallback">{name.slice(0, 1).toUpperCase()}</span>;
  const identity = <><strong>{name}{(author.verification?.verified === true || author.verified === true) && <span className="verifiedBadge" title="Verified on X" aria-label="Verified on X"> ✓</span>}</strong><span>@{handle}</span></>;
  return <header className="author">
    {href ? <Link prefetch={false} className="avatarLink" href={href} aria-label={`View @${handle}'s profile`}>{image}</Link> : image}
    <div className="authorIdentity">{href ? <Link prefetch={false} className="authorProfileLink" href={href}>{identity}</Link> : identity}</div>
    {children}
  </header>;
}
