import { buildDiscordComponent, hasMultipleMedia } from "./discord-component.mjs";
import { metadataDescription, textValue } from "./post-info.mjs";
import { previewImage, previewVideo } from "./post-media.mjs";

const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function inlineComponent(payload) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return Buffer.byteLength(json) <= 3000 ? json : null;
}

export function discordPreviewHtml(post, origin) {
  const handle = textValue(post.author?.screen_name);
  const url = `${origin}/${handle}/status/${post.id}`;
  const title = `${textValue(post.author?.name) || handle} (@${handle}) on X`;
  const description = metadataDescription(post, handle);
  const payload = hasMultipleMedia(post) ? buildDiscordComponent(post, origin) : null;
  const inline = payload ? inlineComponent(payload) : null;
  // A gallery must not simultaneously advertise a standalone Twitter player.
  // Older clients retain the album image and the link to the full post.
  const video = inline ? null : previewVideo(post);
  const image = previewImage(post);
  const meta = (property, content, name = false) => content == null ? "" : `<meta ${name ? "name" : "property"}="${property}" content="${escape(content)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(title)}</title>${inline ? `<script id="discord:component-embed" type="application/json">${inline}</script>` : ""}${meta("og:title", title)}${meta("og:description", description)}${meta("og:url", url)}${meta("og:site_name", "Fxt")}${meta("og:type", video ? "video.other" : "article")}${meta("og:image", image)}${video ? meta("og:video", video.url) + meta("og:video:secure_url", video.url) + meta("og:video:type", video.type) + meta("og:video:width", video.width) + meta("og:video:height", video.height) : ""}${meta("twitter:card", video ? "player" : image ? "summary_large_image" : "summary", true)}${meta("twitter:title", title, true)}${meta("twitter:description", description, true)}${meta("twitter:image", image, true)}${video ? meta("twitter:player", `${url}/player`, true) + meta("twitter:player:stream", video.url, true) + meta("twitter:player:stream:content_type", video.type, true) + meta("twitter:player:width", video.width, true) + meta("twitter:player:height", video.height, true) : ""}<link rel="canonical" href="${escape(url)}"></head><body><a href="${escape(url)}">${escape(title)}</a><p>${escape(description)}</p></body></html>`;
}
