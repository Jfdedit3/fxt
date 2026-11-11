import { isVideo, mediaOf, mediaUrl } from "./post-media.mjs";
import { postText, profilePath, safeExternalUrl, textValue } from "./post-info.mjs";

export const DISCORD_COMPONENT_MAX_BYTES = 3000;

function plain(value, maximum) {
  return Array.from(textValue(value)).slice(0, maximum).join("")
    .replace(/\\/g, "\\\\").replace(/([*_`~|[\]<>])/g, "\\$1").replace(/@/g, "@\u200b");
}

export function componentBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

export function buildDiscordComponent(post, origin) {
  const handle = textValue(post?.author?.screen_name);
  if (!profilePath(handle) || !/^\d{1,30}$/.test(String(post?.id ?? ""))) return null;
  const items = mediaOf(post).flatMap(item => {
    const url = safeExternalUrl(mediaUrl(item));
    if (!url || url.length > 2048 || !/\.(mp4|webm|mov|png|gif|jpg|jpeg|webp|avif)$/i.test(new URL(url).pathname)) return [];
    const description = textValue(item.altText);
    return [{ media: { url }, ...(description ? { description: Array.from(description).slice(0, 100).join("") } : {}) }];
  }).slice(0, 10);
  if (!items.length) return null;
  const header = { type: 10, content: `**${plain(post.author.name || handle, 60)}** (@\u200b${plain(handle, 50)})` };
  const text = Array.from(postText(post));
  let textLength = Math.min(600, text.length);
  const body = { type: 10, content: plain(text.slice(0, textLength).join(""), textLength) };
  const gallery = { type: 12, items };
  const footer = { type: 1, components: [{ type: 2, style: 5, url: `${origin}/${handle}/status/${post.id}`, label: "Open post" }] };
  const payload = { component: { type: 17, accent_color: 10980346, components: [header, ...(body.content ? [body] : []), gallery, footer] } };
  if (componentBytes(payload) > DISCORD_COMPONENT_MAX_BYTES) for (const item of items) delete item.description;
  while (componentBytes(payload) > DISCORD_COMPONENT_MAX_BYTES && textLength > 0) {
    textLength = Math.max(0, textLength - 24);
    body.content = plain(text.slice(0, textLength).join(""), textLength);
    if (!textLength) payload.component.components = payload.component.components.filter(component => component !== body);
  }
  if (componentBytes(payload) > DISCORD_COMPONENT_MAX_BYTES) header.content = `@\u200b${plain(handle, 50)}`;
  if (componentBytes(payload) > DISCORD_COMPONENT_MAX_BYTES) payload.component.components = payload.component.components.filter(component => component !== footer);
  // Preserve every selected media item; fall back to OG rather than silently
  // dropping videos to make room for text when URLs alone exceed Discord's cap.
  return componentBytes(payload) <= DISCORD_COMPONENT_MAX_BYTES ? payload : null;
}

export function hasMultipleVideos(post) {
  return mediaOf(post).filter(isVideo).length > 1;
}

export function componentOrigin(requestHeaders, fallback) {
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "").split(",")[0].trim();
  if (!/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return new URL(fallback).origin;
  const forwarded = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = ["http", "https"].includes(forwarded) ? forwarded : /^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? "http" : "https";
  try { return new URL(`${protocol}://${host}`).origin; } catch { return new URL(fallback).origin; }
}
