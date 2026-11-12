import { initialJson, youtubeText as text, youtubeThumbnail as thumbnail, findYouTubeNode as find, limitedYouTubeText, parseYouTubeHtml } from "./youtube-data.mjs";
import { validYouTubeId, normalizeYouTubeUrl } from "./youtube-url.mjs";
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
  const { entries, nextToken } = parseChannelEntries(content, tab);
  const context = channelContext(html);
  const cursor = nextToken && context ? encodeChannelCursor({ token: nextToken, ...context, channelId: channel.id, tab, issuedAt: Date.now() }) : null;
  return { state: "ready", channel, entries, tab, feedState: content ? entries.length ? "ready" : "empty" : "unavailable", hasMore: Boolean(nextToken), cursor };
}

export function parseChannelEntries(content, tab) {
  const entries = [], seen = new Set(), stack = [content]; let count = 0;
  while (stack.length && count++ < 20000 && entries.length < 200) {
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
  const continuation = find(content, node => Boolean(node.continuationItemRenderer));
  const endpoint = continuation?.continuationItemRenderer?.continuationEndpoint || continuation?.continuationItemRenderer?.button?.buttonRenderer?.command;
  return { entries, nextToken: endpoint?.continuationCommand?.token || null };
}

export function channelContext(html) {
  const match = /"INNERTUBE_CONTEXT"\s*:\s*/.exec(html);
  const context = match ? initialJson(`context = ${html.slice(match.index + match[0].length)}`, "context") : null;
  const client = context?.client;
  if (!/^[0-9.]{5,50}$/.test(client?.clientVersion || "")) return null;
  return { clientVersion: client.clientVersion, ...(typeof client.visitorData === "string" && /^[A-Za-z0-9_+/%=-]{1,5000}$/.test(client.visitorData) ? { visitorData: client.visitorData } : {}) };
}

export function encodeChannelCursor(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
export function decodeChannelCursor(value) {
  if (typeof value !== "string" || value.length > 24000 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const data = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!/^UC[A-Za-z0-9_-]{22}$/.test(data.channelId) || !["videos", "shorts", "posts"].includes(data.tab) || !/^[A-Za-z0-9_+/%=-]{1,12000}$/.test(data.token) || !/^[0-9.]{5,50}$/.test(data.clientVersion)) return null;
    if (data.visitorData !== undefined && !/^[A-Za-z0-9_+/%=-]{1,5000}$/.test(data.visitorData)) return null;
    if (!Number.isFinite(data.issuedAt) || Date.now() - data.issuedAt > 3600000 || data.issuedAt > Date.now() + 60000) return null;
    return data;
  } catch { return null; }
}

export async function getMoreYouTubeChannel(cursor, fetcher = fetch) {
  const data = decodeChannelCursor(cursor); if (!data) return { state: "expired", entries: [] };
  try {
    const response = await fetcher("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", { method: "POST", headers: { "Content-Type": "application/json", "X-Youtube-Client-Name": "1", "X-Youtube-Client-Version": data.clientVersion }, body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: data.clientVersion, hl: "en", gl: "US", ...(data.visitorData ? { visitorData: data.visitorData } : {}) } }, continuation: data.token }), redirect: "error", signal: AbortSignal.timeout(6500), cache: "no-store" });
    if (!response.ok) { await response.body?.cancel(); return { state: "unavailable", entries: [] }; }
    const json = JSON.parse(await limitedYouTubeText(response));
    if (json.error) return { state: "unavailable", entries: [] };
    const action = find(json.onResponseReceivedActions || json.onResponseReceivedEndpoints || json.onResponseReceivedCommands, node => Boolean(node.appendContinuationItemsAction || node.reloadContinuationItemsCommand));
    const content = action?.appendContinuationItemsAction?.continuationItems || action?.reloadContinuationItemsCommand?.continuationItems || json.continuationContents?.richGridContinuation?.contents || json.continuationContents?.gridContinuation?.items || json.continuationContents?.sectionListContinuation?.contents;
    if (!content) return { state: "unavailable", entries: [] };
    const { entries, nextToken } = parseChannelEntries(content, data.tab);
    return { state: "ready", entries, cursor: nextToken && nextToken !== data.token ? encodeChannelCursor({ ...data, token: nextToken }) : null };
  } catch { return { state: "unavailable", entries: [] }; }
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
      const signal = AbortSignal.timeout(6500);
      let source = `${originalChannelUrl(ref, tab)}?hl=en`, response;
      for (let redirects = 0; redirects <= 2; redirects++) {
        response = await fetcher(source, { headers: { "User-Agent": "Mozilla/5.0 (compatible; FxtPreview/1.0)", "Accept-Language": "en-US,en;q=0.9", Cookie: "SOCS=CAI" }, signal, redirect: "manual", cache: "no-store" });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const target = new URL(response.headers.get("location"), source);
        await response.body?.cancel();
        if (target.protocol !== "https:" || !["www.youtube.com", "youtube.com", "m.youtube.com"].includes(target.hostname) || target.port || target.username || target.password || !normalizeYouTubeUrl(target.href)?.startsWith("/youtube/channel/")) throw Error("Invalid channel redirect");
        source = target.href;
      }
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
