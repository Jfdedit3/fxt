import { initialJson, youtubeText as text, youtubeThumbnail as thumbnail, findYouTubeNode as find, limitedYouTubeText, parseYouTubeHtml } from "./youtube-data.mjs";
import { validYouTubeId } from "./youtube-url.mjs";
import { validChannelRef, decodeChannelRef, originalChannelUrl, channelRefFromUrl, channelTab } from "./youtube-channel-url.mjs";

export function parseYouTubeChannel(html, ref, tab = "videos") {
  const data = initialJson(html, "ytInitialData");
  const metadata = data?.metadata?.channelMetadataRenderer;
  if (!metadata?.title || !/^UC[A-Za-z0-9_-]{22}$/.test(metadata.externalId || "")) return { state: "unavailable", channel: null };
  if (ref.startsWith("UC") && metadata.externalId !== ref) return { state: "unavailable", channel: null };
  const legacy = data.header?.c4TabbedHeaderRenderer;
  const modern = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
  const parts = modern?.metadata?.contentMetadataViewModel?.metadataRows?.flatMap(row => row.metadataParts || []).map(part => text(part.text)) || [];
  const handle = channelRefFromUrl(metadata.vanityChannelUrl) || parts.find(part => validChannelRef(part) && part.startsWith("@")) || (ref.startsWith("@") ? ref : "");
  const channel = { id: metadata.externalId, name: metadata.title, handle, description: metadata.description || "", avatar: thumbnail(metadata.avatar) || thumbnail(legacy?.avatar) || thumbnail(modern?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image), banner: thumbnail(legacy?.banner) || thumbnail(modern?.banner?.imageBannerViewModel?.image), subscribers: text(legacy?.subscriberCountText) || parts.find(part => /subscribers?\b/i.test(part)) || "", videoCount: text(legacy?.videosCountText) || parts.find(part => /\bvideos?\b/i.test(part)) || "", originalUrl: originalChannelUrl(metadata.externalId, tab) };
  const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || data.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
  const selected = tabs.map(value => value.tabRenderer).find(value => value?.selected);
  const content = selected?.content;
  const entries = [], seen = new Set(), stack = [content]; let count = 0;
  while (stack.length && count++ < 20000 && entries.length < 24) {
    const node = stack.pop(); if (!node || typeof node !== "object") continue;
    const video = node.videoRenderer || node.gridVideoRenderer;
    const short = node.shortsLockupViewModel;
    const lockup = node.lockupViewModel;
    const shortId = short?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || short?.inlinePlayerData?.onVisible?.innertubeCommand?.watchEndpoint?.videoId;
    const post = node.backstagePostRenderer || node.postRenderer;
    let entry = null;
    if (tab !== "posts" && video && validYouTubeId("watch", video.videoId)) entry = { kind: tab === "shorts" ? "shorts" : "watch", id: video.videoId, title: text(video.title), image: thumbnail(video.thumbnail), views: text(video.viewCountText) || text(video.shortViewCountText), duration: text(video.lengthText), published: text(video.publishedTimeText) };
    if (tab === "videos" && lockup && validYouTubeId("watch", lockup.contentId)) {
      const metadata = lockup.metadata?.lockupMetadataViewModel;
      const parts = metadata?.metadata?.contentMetadataViewModel?.metadataRows?.flatMap(row => row.metadataParts || []).map(part => text(part.text)) || [];
      entry = { kind: "watch", id: lockup.contentId, title: text(metadata?.title), image: thumbnail(lockup.contentImage?.thumbnailViewModel?.image), views: parts.find(part => /views?\b/i.test(part)) || "", published: parts.find(part => /ago$/i.test(part)) || "" };
    }
    if (tab === "shorts" && short && validYouTubeId("shorts", shortId)) entry = { kind: "shorts", id: shortId, title: text(short.overlayMetadata?.primaryText), image: thumbnail(short.thumbnail), views: text(short.overlayMetadata?.secondaryText) };
    if (tab === "posts" && post && validYouTubeId("post", post.postId)) {
      const parsed = parseYouTubeHtml(`var ytInitialData = ${JSON.stringify({ backstagePostRenderer: post })};`, "post", post.postId).item;
      if (parsed) entry = { kind: "post", id: parsed.id, title: parsed.text, image: parsed.images[0], published: parsed.published, likes: parsed.likes };
    }
    if (entry && !seen.has(entry.id)) { entries.push(entry); seen.add(entry.id); }
    if (entry) continue; // Do not turn attached/recommended media into channel entries.
    stack.push(...Object.values(node).filter(child => child && typeof child === "object").reverse());
  }
  const hasContinuation = Boolean(find(content, node => Boolean(node.continuationItemRenderer)));
  return { state: "ready", channel, entries, tab, feedState: content ? entries.length ? "ready" : "empty" : "unavailable", hasMore: hasContinuation };
}

const cache = new Map(); const pending = new Map();
export async function getYouTubeChannel(ref, tab = "videos", fetcher = fetch) {
  ref = decodeChannelRef(ref);
  if (!validChannelRef(ref)) return { state: "not-found", channel: null };
  tab = channelTab(tab); const key = `${ref}:${tab}`; const cached = cache.get(key);
  const shared = fetcher === fetch && process.env.FXT_E2E !== "1";
  if (shared && cached && Date.now() - cached.at < 60000) return cached.result;
  if (shared && pending.has(key)) return pending.get(key);
  if (shared && pending.size >= 50) return { state: "unavailable", channel: null };
  const task = (async () => {
    try {
      const response = await fetcher(`${originalChannelUrl(ref, tab)}?hl=en`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; FxtPreview/1.0)", "Accept-Language": "en-US,en;q=0.9", Cookie: "SOCS=CAI" }, signal: AbortSignal.timeout(6500), redirect: "error", cache: "no-store" });
      if (!response.ok) { await response.body?.cancel(); return { state: response.status === 404 ? "not-found" : "unavailable", channel: null }; }
      return parseYouTubeChannel(await limitedYouTubeText(response), ref, tab);
    } catch { return { state: "unavailable", channel: null }; }
  })().then(result => {
    if (shared && result.channel) { if (cache.size >= 100 && !cache.has(key)) cache.delete(cache.keys().next().value); cache.set(key, { at: Date.now(), result }); }
    if (shared && result.state === "not-found") cache.delete(key);
    if (shared && result.state === "unavailable" && cached && Date.now() - cached.at < 300000) return { ...cached.result, stale: true };
    return result;
  }).finally(() => { if (shared) pending.delete(key); });
  if (shared) pending.set(key, task); return task;
}
