import Link from "next/link";
import AccountIdentity from "../../../AccountIdentity";
import { formatCount, localPostUrl, pollChoices, postStats, postText, replyContext, safeExternalUrl, textValue } from "../../../post-info.mjs";

export function PostContext({ post }) {
  const reply = replyContext(post);
  return <>
    {reply && <p className="postContext">Replying to <Link href={reply.href}>@{reply.handle}</Link></p>}
    {post.possibly_sensitive === true && <p className="sensitiveNotice">This post may contain sensitive media.</p>}
  </>;
}

export function PostStatistics({ post }) {
  const stats = postStats(post);
  if (!stats.length) return null;
  return <dl className="postStats" aria-label="Post statistics">
    {stats.map(({ key, label, value }) => <div key={key}><dt>{label}</dt><dd>{formatCount(value)}</dd></div>)}
  </dl>;
}

export function AuthorDetails({ author }) {
  const bio = textValue(author.description);
  const followers = formatCount(author.followers);
  const following = formatCount(author.following);
  const location = textValue(author.location);
  const website = safeExternalUrl(typeof author.website === "object" ? author.website?.url : author.website);
  if (!bio && followers === null && following === null && !location && !website) return null;
  return <details className="authorDetails">
    <summary>About the author</summary>
    {bio && <p className="detailText">{bio}</p>}
    <ul className="authorFacts">
      {followers !== null && <li><strong>{followers}</strong> followers</li>}
      {following !== null && <li><strong>{following}</strong> following</li>}
      {location && <li>{location}</li>}
      {website && <li><a href={website} target="_blank" rel="noreferrer">Website ↗</a></li>}
    </ul>
  </details>;
}

export default function PostDetails({ post }) {
  const quote = post.quote;
  const quotedUrl = localPostUrl(quote);
  const quoteImage = quote?.type !== "tombstone" ? safeExternalUrl(quote?.media?.mosaic?.formats?.jpeg) ||
    safeExternalUrl(quote?.media?.photos?.[0]?.url) || safeExternalUrl(quote?.media?.all?.[0]?.thumbnail_url) : null;
  const card = post.card;
  const cardUrl = safeExternalUrl(card?.url);
  const cardImage = safeExternalUrl(card?.image?.url);
  const choices = pollChoices(post.poll);
  const votes = formatCount(post.poll?.total_votes);
  const note = textValue(post.community_note?.text);
  const language = textValue(post.lang);
  return <>
    {quote && <section className="detailPanel quotedPost" aria-label="Quoted post">
      <h2>Quoted post</h2>
      {quote.type === "tombstone" ? <p>Quoted post unavailable.</p> : <>
        <AccountIdentity author={quote.author || quote.user || {}} />
        <p className="detailText">{postText(quote) || "This post contains media."}</p>
        {quoteImage && <img className="postMedia" src={quoteImage} alt="Media from quoted post" loading="lazy" />}
        {quotedUrl && <Link className="detailLink" href={quotedUrl}>View quoted post ↗</Link>}
      </>}
    </section>}
    {choices.length > 0 && <section className="detailPanel" aria-label="Poll results">
      <h2>Poll</h2>
      <ul className="pollChoices">{choices.map((choice, index) => <li key={index}>
        <div><span>{choice.label}</span><strong>{choice.percent.toFixed(1)}%</strong></div>
        <meter min="0" max="100" value={choice.percent} aria-label={choice.label} />
        {choice.count !== null && <small>{formatCount(choice.count)} votes</small>}
      </li>)}</ul>
      <p className="detailMeta">{votes !== null ? `${votes} votes` : "Results from X"}{textValue(post.poll.time_left_en) ? ` · ${post.poll.time_left_en}` : ""}. Vote on X.</p>
    </section>}
    {cardUrl && <a className="detailPanel linkCard" href={cardUrl} target="_blank" rel="noreferrer">
      {cardImage && <img src={cardImage} alt={textValue(card.image?.alt)} loading="lazy" />}
      <span className="detailMeta">{new URL(cardUrl).hostname}</span>
      <strong>{textValue(card.title) || cardUrl}</strong>
      {textValue(card.description) && <span>{card.description}</span>}
    </a>}
    {note && <section className="detailPanel communityNote"><h2>Community note</h2><p className="detailText">{note}</p></section>}
    {language && language !== "und" && <p className="detailMeta">Post language: {language}</p>}
  </>;
}
