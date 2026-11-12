import { durationLabel } from "./i18n.mjs";
import { inlineComponent } from "./discord-preview.mjs";
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const plain = value => value.replace(/\\/g, "\\\\").replace(/([*_`~|[\]<>])/g, "\\$1").replace(/@/g, "@\u200b");

export function youtubeComponent(item) {
  if (item.kind !== "post" || !item.images.length) return null;
  const gallery = { type: 12, items: item.images.slice(0, 10).map(url => ({ media: { url } })) };
  const header = { type: 10, content: `**${plain(item.author.slice(0, 80))}** · YouTube` };
  const body = { type: 10, content: plain(item.text.slice(0, 600)) || "Community post" };
  const footer = { type: 1, components: [{ type: 2, style: 5, label: "View on YouTube", url: item.originalUrl }] };
  const payload = { component: { type: 17, accent_color: 16711680, components: [header, body, gallery, footer] } };
  let inline = inlineComponent(payload);
  if (!inline) { payload.component.components = [header, gallery, footer]; inline = inlineComponent(payload); }
  return inline;
}

export function youtubeDescription(item) {
  return [item.author, durationLabel(item.duration), item.published, item.views ? `${item.views} views` : "", item.likes ? `${item.likes} likes` : "", item.text].filter(Boolean).join(" · ").slice(0, 300);
}

export function youtubePreviewHtml(item, origin) {
  const url = `${origin}/youtube/${item.kind}/${item.id}`;
  const inline = youtubeComponent(item);
  const player = item.videoId && !inline ? `https://www.youtube.com/embed/${item.videoId}` : null;
  const meta = (key, value, name = false) => value ? `<meta ${name ? "name" : "property"}="${key}" content="${escape(value)}">` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(item.title)}</title>${inline ? `<script id="discord:component-embed" type="application/json">${inline}</script>` : ""}${meta("og:title", item.title)}${meta("og:description", youtubeDescription(item))}${meta("og:url", url)}${meta("og:site_name", "YouTube · Fxt")}${meta("og:type", player ? "video.other" : "article")}${item.images.map(image => meta("og:image", image)).join("")}${player ? meta("og:video", player) + meta("og:video:type", "text/html") + meta("og:video:width", "1280") + meta("og:video:height", "720") : ""}${meta("twitter:card", player ? "player" : "summary_large_image", true)}${player ? meta("twitter:player", player, true) + meta("twitter:player:width", "1280", true) + meta("twitter:player:height", "720", true) : ""}${meta("twitter:image", item.images[0], true)}</head><body><a href="${escape(item.originalUrl)}">${escape(item.title)}</a></body></html>`;
}
