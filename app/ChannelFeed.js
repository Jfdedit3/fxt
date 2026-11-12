"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SourceLabel, useLanguage } from "./Language";
export default function ChannelFeed({ initialEntries, initialCursor, channelName }) {
  const [entries, setEntries] = useState(initialEntries), [cursor, setCursor] = useState(initialCursor), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const controller = useRef(null); const busy = useRef(false); const { t } = useLanguage();
  useEffect(() => () => controller.current?.abort(), []);
  async function more() {
    if (busy.current) return; busy.current = true; setLoading(true); setError(""); controller.current = new AbortController();
    try {
      const response = await fetch("/api/youtube-channel-more", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cursor }), signal: controller.current.signal });
      if (!response.ok) throw Error(response.status === 410 ? "This page expired. Refresh to continue." : "Could not load more. Try again.");
      const result = await response.json();
      if (!Array.isArray(result.entries)) throw Error("Could not load more. Try again.");
      setEntries(previous => { const seen = new Set(previous.map(entry => `${entry.kind}:${entry.id}`)); return [...previous, ...result.entries.filter(entry => !seen.has(`${entry.kind}:${entry.id}`))]; });
      setCursor(result.cursor || null);
    } catch (failure) { if (failure.name !== "AbortError") setError(failure.message === "This page expired. Refresh to continue." ? failure.message : "Could not load more. Try again."); }
    finally { busy.current = false; setLoading(false); }
  }
  return <><section className="channelFeed">{entries.map(entry => <article className="channelEntry" key={`${entry.kind}:${entry.id}`}><Link href={`/youtube/${entry.kind}/${entry.id}`} prefetch={false}>{entry.image && <img src={entry.image} className="channelThumbnail" alt="" loading="lazy" />}<h2>{entry.title || channelName}</h2></Link>{entry.duration && <span className="detailMeta">{entry.duration}</span>}{entry.views && <p className="detailMeta"><SourceLabel>{entry.views}</SourceLabel></p>}{entry.published && <p className="detailMeta"><SourceLabel>{entry.published}</SourceLabel></p>}</article>)}</section>{error && <p role="alert">{t(error)}</p>}{cursor && <div className="profilePagination"><button type="button" onClick={more} disabled={loading}>{t(loading ? "Loading…" : "Load more")}</button></div>}</>;
}
