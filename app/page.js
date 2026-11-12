"use client";

import { useLanguage, T } from "./Language";
import Link from "next/link";
import { useState } from "react";
import { normalizeDiscordUrl } from "./discord-url.mjs";
import { normalizeXUrl } from "./x-url.mjs";
import { normalizeYouTubeUrl } from "./youtube-url.mjs";

export default function Home() {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    const path = normalizeDiscordUrl(url) || normalizeYouTubeUrl(url) || normalizeXUrl(url);
    if (!path) { setError("Enter an X/Twitter profile or post, or a YouTube channel/video/post, or a Discord user or invite URL."); return; }
    window.location.href = path;
  }
  return <main className="shell">
    <nav className="nav"><a className="brand" href="/"><span className="brandMark">f</span> fxt<span className="brandDot">.</span></a><span className="navNote"><T>OPEN LINK PREVIEW SERVICE</T></span></nav>
    <section className="hero">
      <div className="eyebrow"><span className="pulse" /> <T>A BETTER WAY TO SHARE X, YOUTUBE & DISCORD</T></div>
      <h1><T>Make every post</T><br /><span className="gradient"><T>worth the click.</T></span></h1>
      <p className="intro"><T>Cleaner previews for X/Twitter, YouTube and Discord. Paste a public link to get a shareable Fxt link.</T></p>
      <form className="linkForm" onSubmit={submit}>
        <div className="inputWrap"><span className="inputIcon">↗</span><input aria-label={t("X, YouTube or Discord URL")} value={url} onChange={e => {setUrl(e.target.value);setError("");}} placeholder={t("Paste an X, YouTube or Discord link")} autoComplete="url" /></div>
        <button type="submit"><T>Open link</T> <span>→</span></button>
      </form>
      {error && <p className="error" role="alert">{t(error)}</p>}
      <div className="hint"><span>↳</span> <T>Replace x.com or youtube.com with your Fxt domain to share a link.</T></div>
    </section>
    <section className="features">
      <article className="feature"><div className="featureIcon purple">▣</div><h2><T>Rich previews</T></h2><p><T>Server-rendered metadata helps chat apps show post details and media.</T></p></article>
      <article className="feature"><div className="featureIcon cyan">▶</div><h2><T>Media first</T></h2><p><T>Post images and videos can appear directly in supported chat clients.</T></p></article>
      <article className="feature"><div className="featureIcon green">⌁</div><h2><T>Simple by design</T></h2><p><T>No account required. Paste a link, copy the result, share it anywhere.</T></p></article>
    </section>
    <footer><span>FXT <span className="brandDot">/</span> <T>INDEPENDENT COMMUNITY PROJECT</T></span><Link href="/status"><T>Service status</T></Link><a href="https://github.com/Jfdedit3/fxt"><T>Source code ↗</T></a></footer>
  </main>;
}
