"use client";
import { useState } from "react";
import { useLanguage } from "./Language";
export default function ShareButton({ url, title = "Fxt" }) {
  const { t } = useLanguage(); const [message, setMessage] = useState("");
  async function share() {
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); setMessage(t("Copied!")); } }
    catch (error) { if (error.name !== "AbortError") setMessage(t("Share failed. You can copy the link instead.")); }
  }
  return <span className="shareControl"><button type="button" onClick={share}>{t("Share")} ↗</button>{message && <span role="status">{message}</span>}</span>;
}
