"use client";

import { useState } from "react";

function normalizeXUrl(value) {
  const raw = value.trim();
  if (!raw) return null;
  let url;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["x.com", "twitter.com", "mobile.twitter.com", "www.x.com"].includes(host)) return null;
  const match = url.pathname.match(/^\/@?([^/]+)\/status\/(\d+)/i);
  if (!match) return null;
  return `/${encodeURIComponent(match[1])}/status/${match[2]}`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    const path = normalizeXUrl(url);
    if (!path) { setError("Enter a valid X/Twitter post URL, for example x.com/user/status/123456789."); return; }
    window.location.href = path;
  }
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/"><span className="brandMark">f</span> fxt<span className="brandDot">.</span></a><span className="navNote">OPEN LINK PREVIEW SERVICE</span></nav>
    <section className="hero">
      <div className="eyebrow"><span className="pulse" /> A BETTER WAY TO SHARE X</div>
      <h1>Make every post<br /><span className="gradient">worth the click.</span></h1>
      <p className="intro">Cleaner previews for X/Twitter links. Paste a post URL and get a shareable link designed for chat apps.</p>
      <form className="linkForm" onSubmit={submit}>
        <div className="inputWrap"><span className="inputIcon">↗</span><input aria-label="X post URL" value={url} onChange={e => {setUrl(e.target.value);setError("");}} placeholder="https://x.com/user/status/…" autoComplete="url" /></div>
        <button type="submit">Fix link <span>→</span></button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="hint"><span>↳</span> You can also replace <code>x.com</code> with your Fxt domain in any post link.</div>
    </section>
    <section className="features">
      <article className="feature"><div className="featureIcon purple">▣</div><h2>Rich previews</h2><p>Server-rendered metadata helps chat apps show post details and media.</p></article>
      <article className="feature"><div className="featureIcon cyan">▶</div><h2>Media first</h2><p>Post images and videos can appear directly in supported chat clients.</p></article>
      <article className="feature"><div className="featureIcon green">⌁</div><h2>Simple by design</h2><p>No account required. Paste a link, copy the result, share it anywhere.</p></article>
    </section>
    <footer><span>FXT <span className="brandDot">/</span> INDEPENDENT COMMUNITY PROJECT</span><a href="https://github.com/Jfdedit3/fxt">Source code ↗</a></footer>
  </main>;
}
