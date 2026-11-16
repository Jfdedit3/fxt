import { validPixivId, pixivImageSource } from "./pixiv-url.mjs";
import { limitedYouTubeText } from "./youtube-data.mjs";
export function pixivText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?\s*>|<\/(?:p|div)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_whole, key) => { if (key[0] !== "#") return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[key.toLowerCase()]; const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1)); return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ""; }).trim().slice(0, 20000);
}
const count = value => value !== null && value !== undefined && value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
export function parsePixivArtwork(body, pages, id) {
  if (String(body?.illustId || body?.id) !== id || !validPixivId(String(body.userId)) || !Array.isArray(pages)) return null;
  const images = pages.slice(0, 200).map(page => ({ regular: pixivImageSource(page.urls?.regular || page.urls?.original), original: pixivImageSource(page.urls?.original || page.urls?.regular), width: count(page.width), height: count(page.height) })).filter(image => image.regular && image.original);
  if (!images.length) return null;
  const tags = (Array.isArray(body.tags?.tags) ? body.tags.tags : []).map(tag => tag?.tag).filter(tag => typeof tag === "string").slice(0, 100);
  return { id, title: pixivText(body.illustTitle || body.title), description: pixivText(body.description), authorId: String(body.userId), author: pixivText(body.userName), avatar: pixivImageSource(body.userImageUrl), images, total: count(body.pageCount) || images.length, complete: images.length === Number(body.pageCount || images.length), tags, sensitive: Number(body.xRestrict) > 0 || tags.some(tag => /^R-18/i.test(tag)), created: typeof body.createDate === "string" ? body.createDate : null, likes: count(body.likeCount), bookmarks: count(body.bookmarkCount), views: count(body.viewCount), animation: Number(body.illustType) === 2, source: "pixiv" };
}
export const phixivStatusId = (id, page = 0, range = 0) => ((BigInt(Math.min(range, 255)) << 56n) | (1n << 48n) | (BigInt(id) << 16n) | BigInt(page)).toString();
export function parsePhixivArtwork(first, last, id) {
  if (String(first?.id) !== id || String(last?.id) !== id || !validPixivId(String(first.account?.id))) return null;
  const raw = (first.media_attachments || []).filter(item => item.type === "image" && pixivImageSource(item.url));
  const tail = (last.media_attachments || []).filter(item => item.type === "image" && pixivImageSource(item.url)).at(-1);
  if (!raw.length || !tail) return null;
  const pattern = new RegExp(`^(.*\\/${id}_p)(\\d+)(_master\\d+\\.(?:jpg|png|webp))$`);
  const head = pattern.exec(raw[0].url), end = pattern.exec(tail.url);
  let urls = raw.map(image => image.url), complete = false;
  if (head && end && head[1] === end[1] && head[3] === end[3] && Number(head[2]) === 0 && Number(end[2]) < 200 && raw.every((image, index) => image.url === `${head[1]}${index}${head[3]}`)) {
    urls = Array.from({ length: Number(end[2]) + 1 }, (_value, index) => `${head[1]}${index}${head[3]}`); complete = true;
  }
  const title = /<strong><a\b[^>]*>([\s\S]*?)<\/a><\/strong>/i.exec(first.content || "")?.[1];
  const tags = [...(first.content || "").matchAll(/#([^<#\n,]+)/g)].map(match => pixivText(match[1]).trim()).filter(Boolean);
  return { id, title: pixivText(title) || "Pixiv artwork", description: pixivText(first.content), authorId: String(first.account.id), author: pixivText(first.account.display_name), avatar: pixivImageSource(first.account.avatar), images: urls.map(url => ({ regular: url, original: url, width: null, height: null })), total: complete ? urls.length : null, complete, tags, sensitive: tags.some(tag => /^R-18/i.test(tag)), created: first.created_at || null, likes: null, bookmarks: null, views: null, animation: false, source: "phixiv" };
}
async function readJson(url, fetcher, signal) {
  const response = await fetcher(url, { headers: { Accept: "application/json", Referer: "https://www.pixiv.net/", "User-Agent": "Mozilla/5.0" }, signal, redirect: "error", cache: "no-store" });
  if (!response.ok) { await response.body?.cancel(); return { status: response.status, data: null }; }
  return { status: 200, data: JSON.parse(await limitedYouTubeText(response, 2 * 1024 * 1024)) };
}
const success = new Map(), pending = new Map();
export async function getPixivArtwork(id, fetcher = fetch) {
  if (!validPixivId(id)) return { state: "not-found", item: null };
  const shared = fetcher === fetch && process.env.FXT_E2E !== "1", saved = success.get(id);
  if (shared && saved && Date.now() - saved.at < 60000) return saved.result;
  if (shared && pending.has(id)) return pending.get(id);
  if (shared && pending.size >= 50) return { state: "unavailable", item: null };
  const deadline = AbortSignal.timeout(6500);
  const task = (async () => {
    try {
      const signal = AbortSignal.any([deadline, AbortSignal.timeout(1800)]);
      const [detail, pages] = await Promise.all([readJson(`https://www.pixiv.net/ajax/illust/${id}?lang=en`, fetcher, signal), readJson(`https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`, fetcher, signal)]);
      if (detail.status === 404) return { state: "not-found", item: null };
      const item = !detail.data?.error && !pages.data?.error && parsePixivArtwork(detail.data?.body, pages.data?.body, id);
      if (item) return { state: "ready", item };
    } catch { /* Public Phixiv metadata is an anonymous fallback, never an account session. */ }
    try {
      if (BigInt(id) > 0xffffffffn) return { state: "unavailable", item: null };
      const [first, last] = await Promise.all([readJson(`https://www.phixiv.net/api/v1/statuses/${phixivStatusId(id, 0, 2)}`, fetcher, deadline), readJson(`https://www.phixiv.net/api/v1/statuses/${phixivStatusId(id, 65535)}`, fetcher, deadline)]);
      if (first.status === 404 && last.status === 404) return { state: "not-found", item: null };
      const item = parsePhixivArtwork(first.data, last.data, id); return { state: item ? "ready" : "unavailable", item };
    } catch { return { state: "unavailable", item: null }; }
  })().then(result => { if (shared && result.item) { if (success.size >= 100 && !success.has(id)) success.delete(success.keys().next().value); success.set(id, { at: Date.now(), result }); } return result; }).finally(() => { if (shared) pending.delete(id); });
  if (shared) pending.set(id, task); return task;
}
export async function getPixivUser(id, seed, fetcher = fetch) {
  if (!validPixivId(id)) return { state: "not-found", user: null };
  try {
    const signal = AbortSignal.timeout(3500);
    const [profile, listing] = await Promise.all([readJson(`https://www.pixiv.net/ajax/user/${id}?full=1&lang=en`, fetcher, signal), readJson(`https://www.pixiv.net/ajax/user/${id}/profile/all?lang=en`, fetcher, signal)]);
    if (profile.status === 404) return { state: "not-found", user: null };
    const body = profile.data?.body;
    if (!profile.data?.error && String(body?.userId) === id && typeof body.name === "string" && body.name.trim()) {
      const ids = [...Object.keys(listing.data?.body?.illusts || {}), ...Object.keys(listing.data?.body?.manga || {})].filter(validPixivId).sort((a,b) => Number(b) - Number(a)).slice(0, 20);
      return { state: "ready", user: { id, name: pixivText(body.name), bio: pixivText(body.commentHtml || body.comment), avatar: pixivImageSource(body.imageBig || body.image), artworks: ids, limited: !listing.data || Boolean(listing.data.error) } };
    }
  } catch { /* Keep a verified author link available when a public artwork supplies identity. */ }
  if (validPixivId(seed)) {
    const result = await getPixivArtwork(seed, fetcher);
    if (result.item?.authorId === id) return { state: "ready", user: { id, name: result.item.author, avatar: result.item.avatar, bio: "", artworks: [seed], limited: true } };
  }
  return { state: "unavailable", user: null };
}
