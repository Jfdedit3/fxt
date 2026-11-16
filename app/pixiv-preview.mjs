import { inlineComponent } from "./discord-preview.mjs";
import { pixivProxyUrl } from "./pixiv-url.mjs";
export function pixivPanels(item) {
  if (item.images.length <= 10) return [];
  const size = Math.max(4, Math.ceil(item.images.length / 10));
  return Array.from({ length: Math.ceil(item.images.length / size) }, (_value, index) => ({ images: item.images.slice(index * size, (index + 1) * size), first: index * size + 1, last: Math.min((index + 1) * size, item.images.length) }));
}
export const pixivPanelUrl = (id, index, origin = "") => `${origin}/api/pixiv-panel/${id}/${index + 1}.jpg`;
const plain = value => value.replace(/\\/g, "\\\\").replace(/([*_`~|[\]<>])/g, "\\$1").replace(/@/g, "@\u200b");
export function pixivComponent(item, origin) {
  const panels = pixivPanels(item);
  const images = panels.length ? panels.map((_panel, index) => pixivPanelUrl(item.id, index, origin)) : item.images.map(image => `${origin}${pixivProxyUrl(image.regular)}`);
  const header = { type: 10, content: `**${plain(item.title.slice(0, 100))}**\n${plain(item.author.slice(0, 80))} · Pixiv` };
  const body = { type: 10, content: plain(item.description.slice(0, 500)) || "Pixiv" };
  const gallery = { type: 12, items: images.slice(0, 10).map(url => ({ media: { url } })) };
  const footer = { type: 1, components: [{ type: 2, style: 5, label: `View ${item.images.length} images`, url: `${origin}/pixiv/artworks/${item.id}` }] };
  const payload = { component: { type: 17, accent_color: 3842559, spoiler: item.sensitive, components: [header, body, gallery, footer] } };
  let inline = inlineComponent(payload);
  if (!inline) { payload.component.components = [header, gallery, footer]; inline = inlineComponent(payload); }
  return inline;
}
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export function pixivPreviewHtml(item, origin) {
  const inline = pixivComponent(item, origin), panels = pixivPanels(item);
  const image = panels.length ? pixivPanelUrl(item.id, 0, origin) : `${origin}${pixivProxyUrl(item.images[0].regular)}`;
  const meta = (name, value, twitter = false) => `<meta ${twitter ? "name" : "property"}="${name}" content="${escape(value)}">`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(item.title)}</title>${inline ? `<script id="discord:component-embed" type="application/json">${inline}</script>` : ""}${meta("og:title", item.title)}${meta("og:description", `${item.author} · ${item.images.length} images\n${item.description}`.slice(0, 300))}${meta("og:url", `${origin}/pixiv/artworks/${item.id}`)}${meta("og:site_name", "Pixiv · Fxt")}${meta("og:type", "article")}${meta("og:image", image)}${meta("twitter:card", "summary_large_image", true)}${meta("twitter:image", image, true)}</head><body><a href="${origin}/pixiv/artworks/${item.id}">${escape(item.title)}</a></body></html>`;
}
