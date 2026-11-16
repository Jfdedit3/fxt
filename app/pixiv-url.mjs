export const validPixivId = value => typeof value === "string" && /^[1-9]\d{0,11}$/.test(value);
export function normalizePixivUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let url; try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || !["pixiv.net", "www.pixiv.net", "m.pixiv.net"].includes(url.hostname.toLowerCase())) return null;
  const path = url.pathname.replace(/^\/(?:en|fr|ja|ko|zh|zh-tw)\//, "/");
  const match = /^\/(artworks|users)\/(\d+)(?:\/(?:artworks|illustrations|manga))?\/?$/.exec(path);
  if (match && validPixivId(match[2])) return `/pixiv/${match[1]}/${match[2]}`;
  const id = path === "/member_illust.php" ? url.searchParams.get("illust_id") : path === "/member.php" ? url.searchParams.get("id") : null;
  return validPixivId(id) ? `/pixiv/${path === "/member.php" ? "users" : "artworks"}/${id}` : null;
}
export function pixivImageSource(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.href.length > 1500) return null;
    if (url.hostname === "i.pximg.net" && /^\/(?:img-original|img-master|user-profile|background|c|common)\//.test(url.pathname)) return url.href;
    if (url.hostname === "www.phixiv.net" && /^\/i\/(?:img-original|img-master|user-profile|background|c|common)\//.test(url.pathname)) return url.href;
    return null;
  } catch { return null; }
}
export function pixivProxyUrl(source, { download = false } = {}) { const safe = pixivImageSource(source); return safe ? `/api/pixiv-image?url=${encodeURIComponent(safe)}${download ? "&download=1" : ""}` : null; }
