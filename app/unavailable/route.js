import { validChannelRef, originalChannelUrl, channelTab } from "../youtube-channel-url.mjs";
import { translate } from "../i18n.mjs";
import { validYouTubeId, youtubeOriginalUrl } from "../youtube-url.mjs";
const escape = value => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export function GET(request) {
  const requestUrl = new URL(request.url); const value = requestUrl.searchParams.get("return") || "/";
  let target = "/", original = "";
  try {
    const url = new URL(value, "https://fxt.invalid");
    const channel = /^\/youtube\/channel\/([^/]+)$/.exec(decodeURIComponent(url.pathname));
    if (url.origin === "https://fxt.invalid" && (channel && validChannelRef(channel[1]) ||/^\/[a-zA-Z0-9_]{1,50}(?:\/status\/\d{1,30}(?:\/player)?)?$/.test(url.pathname) || /^\/youtube\/(post|watch|shorts)\/[A-Za-z0-9_-]{11,102}$/.test(url.pathname))) {
      target = url.pathname + url.search;
      const youtube = /^\/youtube\/(post|watch|shorts)\/([^/]+)$/.exec(url.pathname);
      if (channel) original = originalChannelUrl(channel[1], channelTab(url.searchParams.get("tab")));
      else if (youtube && validYouTubeId(youtube[1], youtube[2])) original = youtubeOriginalUrl(youtube[1], youtube[2]);
      else if (!youtube) original = `https://x.com${url.pathname}`;
    }
  } catch { /* Keep a safe local retry link. */ }
  const requested = requestUrl.searchParams.get("lang");
  const language = ["en", "fr"].includes(requested) ? requested : /(?:^|;\s*)fxt_language=fr(?:;|$)/.test(request.headers.get("cookie") || "") ? "fr" : "en";
  const t = value => translate(language, value);
  const switchUrl = lang => `/unavailable?return=${encodeURIComponent(target)}&lang=${lang}`;
  return new Response(`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${t("Temporarily unavailable")} | Fxt</title><style>body{background:#080910;color:#f4f5ff;font:16px system-ui;margin:0;min-height:100vh;display:grid;place-items:center}main{max-width:480px;padding:28px;line-height:1.8}a{color:#70e1f5;margin-right:20px}p{color:#979bad}</style></head><body><main><nav><a href="${escape(switchUrl("en"))}" lang="en">English</a><a href="${escape(switchUrl("fr"))}" lang="fr">Français</a></nav><h1>${t("Temporarily unavailable")}</h1><p>${t("We couldn’t retrieve this content right now. Try again later or open the original link.")}</p><a href="${escape(target)}">${t("Try again")} →</a>${original ? `<a href="${escape(original)}" target="_blank" rel="noreferrer">${t("Open original ↗")}</a>` : ""}<a href="/">${t("Back to Fxt")}</a></main></body></html>`, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "30", "X-Robots-Tag": "noindex, nofollow", ...(requested ? { "Set-Cookie": `fxt_language=${language}; Path=/; Max-Age=31536000; SameSite=Lax` } : {}) } });
}
