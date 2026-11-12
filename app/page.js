"use client";

import { useState } from "react";
import { normalizeXUrl } from "./x-url.mjs";
import { normalizeYouTubeUrl } from "./youtube-url.mjs";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    const path = normalizeYouTubeUrl(url) || normalizeXUrl(url);
    if (!path) { setError("Enter an X/Twitter profile or post, or a YouTube video, Short or community post URL."); return; }
    window.location.href = path;
  }
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/"><span className="brandMark">f</span> fxt<span className="brandDot">.</span></a><span className="navNote">OPEN LINK PREVIEW SERVICE</span></nav>
    <section className="hero">
      <div className="eyebrow"><span className="pulse" /> A BETTER WAY TO SHARE X & YOUTUBE</div>
      <h1>Make every post<br /><span className="gradient">worth the click.</span></h1>
      <p className="intro">Cleaner previews for X/Twitter and YouTube. Paste a post, profile, video or Shorts URL to get a shareable Fxt link.</p>
      <form className="linkForm" onSubmit={submit}>
        <div className="inputWrap"><span className="inputIcon">↗</span><input aria-label="X or YouTube URL" value={url} onChange={e => {setUrl(e.target.value);setError("");}} placeholder="Paste an X or YouTube link" autoComplete="url" /></div>
        <button type="submit">Open link <span>→</span></button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="hint"><span>↳</span> You can also replace <code>x.com</code> with your Fxt domain in any post or profile link.</div>
    </section>
    <section className="features">
      <article className="feature"><div className="featureIcon purple">▣</div><h2>Rich previews</h2><p>Server-rendered metadata helps chat apps show post details and media.</p></article>
      <article className="feature"><div className="featureIcon cyan">▶</div><h2>Media first</h2><p>Post images and videos can appear directly in supported chat clients.</p></article>
      <article className="feature"><div className="featureIcon green">⌁</div><h2>Simple by design</h2><p>No account required. Paste a link, copy the result, share it anywhere.</p></article>
    </section>
    <footer><span>FXT <span className="brandDot">/</span> INDEPENDENT COMMUNITY PROJECT</span><a href="https://github.com/Jfdedit3/fxt">Source code ↗</a></footer>
  </main>;
}
