export function decodeChannelRef(value) {
  try { const ref = decodeURIComponent(value); return validChannelRef(ref) ? ref : null; } catch { return null; }
}
export function validChannelRef(value) {
  return typeof value === "string" && (/^UC[A-Za-z0-9_-]{22}$/.test(value) || /^@[\p{L}\p{N}_.-]{1,50}$/u.test(value) || /^(?:c|user)~[\p{L}\p{N}_.-]{1,100}$/u.test(value));
}
export function channelTab(value) { return ["videos", "shorts", "posts"].includes(value) ? value : "videos"; }
export function channelPath(ref, tab = "videos") {
  if (!validChannelRef(ref)) return null;
  return `/youtube/channel/${encodeURIComponent(ref).replace(/^%40/, "@")}?tab=${channelTab(tab)}`;
}
export function originalChannelUrl(ref, tab = "videos") {
  if (!validChannelRef(ref)) return null;
  const legacy = /^(c|user)~(.+)$/.exec(ref);
  const path = legacy ? `${legacy[1]}/${encodeURIComponent(legacy[2])}` : ref.startsWith("@") ? encodeURIComponent(ref).replace(/^%40/, "@") : `channel/${ref}`;
  return `https://www.youtube.com/${path}/${channelTab(tab)}`;
}
export function channelRefFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) return null;
    const legacy = /^\/(c|user)\/([^/]+)\/?$/.exec(url.pathname);
    if (legacy) return decodeChannelRef(`${legacy[1]}~${legacy[2]}`);
    const match = /^\/(?:channel\/)?([^/]+)\/?$/.exec(url.pathname);
    const ref = match ? decodeURIComponent(match[1]) : "";
    return validChannelRef(ref) ? ref : null;
  } catch { return null; }
}
