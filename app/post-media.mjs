import { safeExternalUrl } from "./post-info.mjs";

export function mediaOf(post) {
  const containers = [
    post?.media,
    post?.extended_entities,
    post?.entities,
    post?.legacy?.extended_entities,
    post?.legacy?.entities
  ].filter(value => value && typeof value === "object");

  const combined = [];
  for (const media of containers) {
    if (Array.isArray(media.all)) combined.push(...media.all);
    if (Array.isArray(media.photos)) combined.push(...media.photos.map(item => ({ ...item, type: item?.type || "photo" })));
    if (Array.isArray(media.videos)) combined.push(...media.videos.map(item => ({ ...item, type: item?.type || "video" })));
    if (Array.isArray(media.media)) combined.push(...media.media);
    if (media.external && typeof media.external === "object") {
      combined.push({ ...media.external, type: media.external.type || "video" });
    }
    if (media.mosaic && typeof media.mosaic === "object") {
      combined.push({ ...media.mosaic, type: media.mosaic.type || "mosaic_photo" });
    }
  }

  const seenUrls = new Set();
  return combined.filter(item => {
    if (!item || typeof item !== "object") return false;
    const url = item.url || item.media_url_https || item.media_url || item.thumbnail_url || item.thumbnail || "";
    // Prefer the media URL as identity: some API variants reuse the same item ID
    // across attachments, which would otherwise incorrectly hide later images/videos.
    const key = String(url || item.id || "");
    if (!key || seenUrls.has(key)) return false;
    seenUrls.add(key);
    return true;
  });
}

export function mediaUrl(item) {
  return item?.url || item?.media_url || item?.media_url_https || null;
}

export function isGif(item) {
  const type = String(item?.type || item?.kind || "").toLowerCase();
  return type === "gif" || type === "animated_gif";
}

export function isVideo(item) {
  const type = String(item?.type || item?.kind || "").toLowerCase();
  if (isGif(item)) {
    // X's animated GIFs are normally MP4 videos. Preserve native GIF images
    // when an upstream endpoint explicitly supplies a .gif file instead.
    const url = safeExternalUrl(mediaUrl(item));
    return !url || !/\.gif$/i.test(new URL(url).pathname);
  }
  return type.includes("video");
}

export function thumbnailUrl(item) {
  return item?.thumbnail_url || item?.thumbnail || item?.preview_url || (isVideo(item) ? null : mediaUrl(item));
}

function firstImage(post) {
  for (const item of mediaOf(post)) {
    const image = thumbnailUrl(item);
    if (image) return image;
  }
  return null;
}

export function previewImage(post) {
  // Chat clients may display only one image: use the upstream collage for albums.
  const photos = mediaOf(post).filter(item =>
    !isVideo(item) && safeExternalUrl(mediaUrl(item))
  );
  if (photos.length > 1) {
    const formats = post?.media?.mosaic?.formats;
    const mosaic = safeExternalUrl(formats?.jpeg) || safeExternalUrl(formats?.webp);
    if (mosaic) return mosaic;
  }
  return safeExternalUrl(firstImage(post));
}

export function previewVideo(post) {
  const item = mediaOf(post).find(media => isVideo(media) && safeExternalUrl(mediaUrl(media)));
  if (!item) return null;
  const dimension = (value, fallback) => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 16384 ? Number(value) : fallback;
  const format = item.content_type || item.format;
  return {
    url: safeExternalUrl(mediaUrl(item)),
    type: ["video/mp4", "video/webm", "video/ogg"].includes(format) ? format : "video/mp4",
    width: dimension(item.width, 640), height: dimension(item.height, 360),
    poster: safeExternalUrl(thumbnailUrl(item)), gif: isGif(item)
  };
}

export function videoPlaybackUrl(value) {
  const safeUrl = safeExternalUrl(value);
  if (!safeUrl) return null;
  try {
    const url = new URL(safeUrl);
    // X video URLs often need byte-range requests for seeking and reliable playback.
    // Proxy only the known video host; other providers remain direct links.
    if (url.protocol === "https:" && url.hostname.toLowerCase() === "video.twimg.com") {
      return `/api/video?url=${encodeURIComponent(url.href)}`;
    }
  } catch {}
  return safeUrl;
}

