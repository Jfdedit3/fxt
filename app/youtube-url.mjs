export function validYouTubeId(kind, id) {
  return typeof id === "string" && (kind === "post" ? /^Ug[A-Za-z0-9_-]{10,100}$/.test(id) : ["watch", "shorts"].includes(kind) && /^[A-Za-z0-9_-]{11}$/.test(id));
}

export function normalizeYouTubeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let url;
  try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let kind, id;
  if (host === "youtu.be") { kind = "watch"; id = url.pathname.match(/^\/([^/]+)\/?$/)?.[1]; }
  else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    if (url.pathname === "/watch") { kind = "watch"; id = url.searchParams.get("v"); }
    else { const match = /^\/(post|shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname); if (match) { kind = ["embed", "live"].includes(match[1]) ? "watch" : match[1]; id = match[2]; } }
  }
  return validYouTubeId(kind, id) ? `/youtube/${kind}/${id}` : null;
}

export const youtubeOriginalUrl = (kind, id) => kind === "watch" ? `https://www.youtube.com/watch?v=${id}` : `https://www.youtube.com/${kind}/${id}`;
