import { localPostUrl, profilePath } from "./post-info.mjs";

const API_BASE = "https://api.fxtwitter.com";
export const PROFILE_TABS = ["posts", "replies", "media"];

export function validCursor(cursor) {
  return typeof cursor === "string" && cursor.length > 0 && cursor.length <= 2048 && /^[a-zA-Z0-9_+=/\-]+$/.test(cursor);
}

export function profileOptions(query = {}) {
  return {
    tab: PROFILE_TABS.includes(query.tab) ? query.tab : "posts",
    cursor: validCursor(query.cursor) ? query.cursor : null
  };
}

export function timelineUrl(username, options = {}) {
  if (!profilePath(username)) return null;
  const { tab, cursor } = profileOptions(options);
  const url = new URL(`${API_BASE}/2/profile/${username}/${tab === "media" ? "media" : "statuses"}`);
  url.searchParams.set("count", "12");
  if (tab === "replies") url.searchParams.set("with_replies", "true");
  if (cursor) url.searchParams.set("cursor", cursor);
  return url.href;
}

export function profilePageUrl(username, options = {}) {
  const path = profilePath(username);
  if (!path) return null;
  const { tab, cursor } = profileOptions(options);
  const query = new URLSearchParams();
  if (tab !== "posts") query.set("tab", tab);
  if (cursor) query.set("cursor", cursor);
  return query.size ? `${path}?${query}` : path;
}

async function apiRequest(url, fetcher) {
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "FxtPreview/1.0 (+https://fxt-pi.vercel.app)" },
      signal: AbortSignal.timeout(8000), next: { revalidate: 60 }
    });
    if (response.status === 204) return { state: "ready", data: { results: [] } };
    if (response.status === 404) return { state: "not-found", data: null };
    if (!response.ok) return { state: "unavailable", data: null };
    const data = await response.json();
    if (!data || typeof data !== "object" || (data.code !== undefined && data.code !== 200)) {
      return { state: data?.code === 404 ? "not-found" : "unavailable", data: null };
    }
    return { state: "ready", data };
  } catch { return { state: "unavailable", data: null }; }
}

export async function getProfile(username, fetcher = fetch) {
  if (!profilePath(username)) return { state: "not-found", user: null };
  const result = await apiRequest(`${API_BASE}/2/profile/${username}`, fetcher);
  const user = result.data?.user;
  if (result.state !== "ready") return { state: result.state, user: null };
  if (!profilePath(user?.screen_name) || user.screen_name.toLowerCase() !== username.toLowerCase()) {
    return { state: "unavailable", user: null };
  }
  return { state: "ready", user };
}

export function timelinePosts(data) {
  if (!Array.isArray(data?.results)) return [];
  const seen = new Set();
  return data.results.flatMap(item => item?.type === "thread" && Array.isArray(item.statuses) ? item.statuses : [item])
    .filter(post => {
      if (post?.type === "tombstone" || !localPostUrl(post)) return false;
      const key = String(post.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function getTimeline(username, options = {}, fetcher = fetch) {
  const url = timelineUrl(username, options);
  if (!url) return { state: "unavailable", posts: [], nextCursor: null };
  const result = await apiRequest(url, fetcher);
  // A 404 here can mean an empty timeline, rather than a missing account.
  if (result.state === "not-found") return { state: "empty", posts: [], nextCursor: null };
  if (result.state !== "ready" || !Array.isArray(result.data?.results)) return { state: "unavailable", posts: [], nextCursor: null };
  const posts = timelinePosts(result.data);
  const bottom = result.data?.cursor?.bottom;
  return {
    state: posts.length ? "ready" : "empty", posts,
    nextCursor: posts.length && validCursor(bottom) && bottom !== options.cursor ? bottom : null
  };
}
