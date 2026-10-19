const HOSTS = new Set(["x.com", "twitter.com", "mobile.x.com", "mobile.twitter.com"]);
const RESERVED = new Set(["home", "explore", "search", "settings", "notifications", "messages", "i", "intent", "share", "compose", "tos", "privacy", "login", "logout", "signup", "account", "hashtag", "api"]);

export function normalizeXUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  let url;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["http:", "https:"].includes(url.protocol) || !HOSTS.has(host) || url.username || url.password || url.port) return null;
  const match = url.pathname.match(/^\/@?([a-zA-Z0-9_]{1,50})(?:\/status\/(\d{1,30})(?:\/(?:photo|video)\/[1-9]\d*)?)?\/?$/i);
  if (!match || RESERVED.has(match[1].toLowerCase())) return null;
  return match[2] ? `/${match[1]}/status/${match[2]}` : `/${match[1]}`;
}
