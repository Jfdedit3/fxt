import { isVideo, isGif, mediaOf, mediaUrl } from "./post-media.mjs";
export function mosaicSource(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "pbs.twimg.com" || url.port || url.username || url.password || !/^\/media\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|avif)$/i.test(url.pathname)) return null;
    url.search = ""; url.searchParams.set("name", "medium");
    return url.href;
  } catch { return null; }
}
export function postMosaicPlan(post, { legacy = false, version = 3 } = {}) {
  const all = mediaOf(post);
  const photos = all.filter(item => !isVideo(item) && !isGif(item) && mosaicSource(mediaUrl(item)));
  if (photos.length <= 10 || photos.length > 100) return null;
  const others = all.filter(item => !photos.includes(item) && mediaUrl(item));
  const available = 10 - others.length;
  if (available < 1) return null;
  const count = Math.min(Math.ceil(photos.length / (legacy || version === 1 ? 10 : version === 2 ? 2 : 4)), available);
  const size = Math.ceil(photos.length / count);
  if (size > 20) return null;
  const packed = !legacy && version >= 3 && count === Math.ceil(photos.length / 4);
  const base = Math.floor(photos.length / count), extra = photos.length % count;
  let offset = 0;
  const groups = Array.from({ length: count }, (_value, index) => {
    const first = offset + 1, end = packed ? Math.min(offset + 4, photos.length) : offset + base + (index < extra ? 1 : 0);
    const group = { items: photos.slice(offset, end), first, last: end }; offset = end; return group;
  });
  return { photos, groups, total: photos.length };
}
export function mosaicUrl(post, origin, page) {
  return `${origin}/api/post-mosaic/${post.author.screen_name}/${post.id}/${page}-v3.jpg`;
}
