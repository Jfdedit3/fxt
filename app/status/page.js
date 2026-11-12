"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage, LocalDate } from "../Language";
export default function Status() {
  const { t } = useLanguage(); const [result, setResult] = useState(null), [error, setError] = useState(false), [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true); setError(false);
    try { const response = await fetch("/api/health"); const data = await response.json(); if (!Array.isArray(data.checks)) throw Error("Unavailable"); setResult(data); } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { let active = true; const controller = new AbortController(); fetch("/api/health", { signal: controller.signal }).then(r => r.json()).then(data => { if (active) { if (Array.isArray(data.checks)) setResult(data); else setError(true); } }).catch(error => { if (active && error.name !== "AbortError") setError(true); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; controller.abort(); }; }, []);
  const names = { x: "X posts", youtube_video: "YouTube videos", youtube_post: "YouTube posts", youtube_channel: "YouTube channels" };
  return <main className="postShell"><Link className="brand" href="/">fxt.</Link><section className="postCard"><h1>{t("Service status")}</h1><p>{t("These sample checks detect source failures and changes. They do not guarantee every link is available.")}</p>{loading && <p role="status">{t("Checking…")}</p>}{error && <p role="alert">{t("Status check unavailable. Try again later.")}</p>}{result && <><p><strong>{t(result.status === "operational" ? "All checks passed" : "Some checks failed")}</strong></p><ul className="healthChecks">{result.checks.map(check => <li key={check.service}><span>{t(names[check.service] || check.service)}</span><strong>{t(check.status === "operational" ? "Operational" : "Degraded")}</strong><small>{check.latencyMs} ms</small></li>)}</ul><p className="detailMeta"><LocalDate value={result.checkedAt} options={{ dateStyle: "medium", timeStyle: "short" }} /> UTC</p></>}<button type="button" onClick={refresh} disabled={loading}>{t("Refresh")}</button><p><a href="https://github.com/Jfdedit3/fxt/actions/workflows/monitor.yml" target="_blank" rel="noreferrer">{t("Scheduled check history ↗")}</a></p></section></main>;
}
