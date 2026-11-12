import { channelRefFromUrl } from "./youtube-channel-url.mjs";
import { validYouTubeId, youtubeOriginalUrl } from "./youtube-url.mjs";

const text = value => typeof value === "string" ? value : value?.simpleText || value?.content || value?.runs?.map(run => run.text || "").join("") || "";
export function youtubeImage(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    return url.href.length <= 2048 && url.protocol === "https:" && !url.username && !url.password && !url.port && /(^|\.)(ytimg\.com|ggpht\.com|googleusercontent\.com)$/.test(url.hostname) ? url.href : null;
  } catch { return null; }
}
const thumbnail = value => [...(value?.thumbnails || value?.sources || [])].reverse().map(item => youtubeImage(item.url)).find(Boolean) || null;

export function initialJson(html, name) {
  // Extract JSON without evaluating remote JavaScript. Braces inside strings
  // and escaped quotes must not terminate the object.
  const pattern = new RegExp(`(?:var\\s+)?${name}\\s*=\\s*|window\\["${name}"\\]\\s*=\\s*`, "g");
  for (const match of html.matchAll(pattern)) {
    const start = match.index + match[0].length;
    if (html[start] !== "{") continue;
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < html.length; i++) {
      const char = html[i];
      if (quoted) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === '"') quoted = false; }
      else if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) { try { return JSON.parse(html.slice(start, i + 1)); } catch { break; } }
    }
  }
  return null;
}

function find(root, predicate) {
  const stack = [root]; let count = 0;
  while (stack.length && count++ < 30000) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    if (predicate(value)) return value;
    stack.push(...Object.values(value).filter(child => child && typeof child === "object"));
  }
  return null;
}

export function parseYouTubeHtml(html, kind, id) {
  if (!validYouTubeId(kind, id)) return { state: "not-found", item: null };
  if (kind === "post") {
    const data = initialJson(html, "ytInitialData");
    const post = find(data, node => node.postId === id && (node.contentText || node.backstageAttachment || node.attachment));
    if (!post) return { state: "unavailable", item: null };
    const images = [];
    const seen = new Set();
    const attachment = post.backstageAttachment || post.attachment;
    // Read attachment renderers only: author avatars and recommended posts are
    // not attachments of this post.
    const stack = [attachment]; let count = 0;
    while (stack.length && count++ < 1000) {
      const node = stack.pop(); if (!node || typeof node !== "object") continue;
      const image = node.backstageImageRenderer || node.postImageRenderer;
      const url = image && thumbnail(image.image || image);
      if (url && !seen.has(url)) { images.push(url); seen.add(url); }
      stack.push(...Object.values(node).filter(child => child && typeof child === "object").reverse());
    }
    const attachedVideo = find(attachment, node => typeof node.videoId === "string" && validYouTubeId("watch", node.videoId));
    const body = text(post.contentText);
    const channelId = post.authorEndpoint?.browseEndpoint?.browseId;
    return { state: "ready", item: { kind, id, title: body.slice(0, 120) || "YouTube community post", text: body, author: text(post.authorText) || "YouTube creator", channelId: /^UC[A-Za-z0-9_-]{22}$/.test(channelId) ? channelId : null, avatar: thumbnail(post.authorThumbnail), published: text(post.publishedTimeText), likes: text(post.voteCount), images: images.slice(0, 10), videoId: attachedVideo?.videoId || null, originalUrl: youtubeOriginalUrl(kind, id) } };
  }
  const player = initialJson(html, "ytInitialPlayerResponse");
  const video = player?.videoDetails;
  if (!video || video.videoId !== id) {
    const unavailable = ["ERROR", "UNPLAYABLE"].includes(player?.playabilityStatus?.status);
    return { state: unavailable ? "not-found" : "unavailable", item: null };
  }
  const details = find(initialJson(html, "ytInitialData"), node => Boolean(node.videoPrimaryInfoRenderer))?.videoPrimaryInfoRenderer;
  const likeButton = find(details?.videoActions, node => Boolean(node.segmentedLikeDislikeButtonRenderer))?.segmentedLikeDislikeButtonRenderer?.likeButton?.toggleButtonRenderer;
  const likes = text(video.likeCount) || text(likeButton?.defaultText);
  return { state: "ready", item: { kind, id, title: text(video.title), text: text(video.shortDescription), author: text(video.author), published: text(player?.microformat?.playerMicroformatRenderer?.publishDate) || text(player?.microformat?.playerMicroformatRenderer?.uploadDate), likes, channelId: /^UC[A-Za-z0-9_-]{22}$/.test(video.channelId) ? video.channelId : null, views: /^\d+$/.test(String(video.viewCount)) ? String(video.viewCount) : null, duration: /^\d+$/.test(String(video.lengthSeconds)) ? Number(video.lengthSeconds) : null, images: [thumbnail(video.thumbnail)].filter(Boolean), videoId: id, originalUrl: youtubeOriginalUrl(kind, id) } };
}

async function limitedText(response, maxBytes = 4 * 1024 * 1024) {
  const reader = response.body?.getReader(); if (!reader) throw Error("Missing body");
  const chunks = []; let length = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > maxBytes) throw Error("YouTube response too large"); chunks.push(value); }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchYouTubeResult(kind, id, fetcher = fetch) {
  if (!validYouTubeId(kind, id)) return { state: "not-found", item: null };
  // Shorts share the watch-page metadata schema; no signed stream scraping.
  const source = kind === "post" ? youtubeOriginalUrl(kind, id) : youtubeOriginalUrl("watch", id);
  const signal = AbortSignal.timeout(6500);
  let result = { state: "unavailable", item: null };
  try {
    const response = await fetcher(`${source}${source.includes("?") ? "&" : "?"}hl=en`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; FxtPreview/1.0)", "Accept-Language": "en-US,en;q=0.9", Cookie: "SOCS=CAI" }, signal, redirect: "error", cache: "no-store" });
    if (response.ok) result = parseYouTubeHtml(await limitedText(response), kind, id);
    else { await response.body?.cancel(); if (response.status === 404) return { state: "not-found", item: null }; }
  } catch { /* Try public oEmbed metadata for videos within the same deadline. */ }
  if (result.item || kind === "post" || result.state === "not-found" || signal.aborted) return result;
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeOriginalUrl("watch", id))}&format=json`;
    const response = await fetcher(endpoint, { signal, redirect: "error", cache: "no-store" });
    if (!response.ok) { await response.body?.cancel(); return result; }
    const data = JSON.parse(await limitedText(response));
    if (data.type === "video" && typeof data.title === "string" && typeof data.author_name === "string") {
      return { state: "ready", item: { kind, id, title: data.title.slice(0, 500), text: "", author: data.author_name.slice(0, 200), channelRef: channelRefFromUrl(data.author_url), images: [youtubeImage(data.thumbnail_url)].filter(Boolean), videoId: id, originalUrl: youtubeOriginalUrl(kind, id) } };
    }
  } catch { /* Preserve the source failure rather than inventing video details. */ }
  return result;
}


const successes = new Map();
const pending = new Map();
export async function getYouTubeResult(kind, id, fetcher = fetch) {
  // Cache only parsed successes: a 200 response containing a bot/consent screen
  // must never hide a recovered post. Custom fetchers bypass shared state.
  if (fetcher !== fetch || process.env.FXT_E2E === "1") return fetchYouTubeResult(kind, id, fetcher);
  if (!validYouTubeId(kind, id)) return { state: "not-found", item: null };
  const key = `${kind}:${id}`; const now = Date.now(); const saved = successes.get(key);
  if (saved && now - saved.at < 60000) return saved.result;
  if (pending.has(key)) return pending.get(key);
  if (pending.size >= 100) return { state: "unavailable", item: null };
  const task = fetchYouTubeResult(kind, id).then(result => {
    if (result.item) { if (successes.size >= 200 && !successes.has(key)) successes.delete(successes.keys().next().value); successes.set(key, { at: Date.now(), result }); }
    if (result.state === "not-found") successes.delete(key);
    if (result.state === "unavailable" && saved && Date.now() - saved.at < 300000) return { ...saved.result, stale: true };
    return result;
  }).finally(() => pending.delete(key));
  pending.set(key, task); return task;
}

export { text as youtubeText, thumbnail as youtubeThumbnail, find as findYouTubeNode, limitedText as limitedYouTubeText };
