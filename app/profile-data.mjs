import { localPostUrl, profilePath } from "./post-info.mjs";

import { fetchApi } from "./upstream.mjs";
import { normalizeAuthor, normalizePost } from "./post-schema.mjs";

const API_BASE = "https://api.fxtwitter.com";
export const PROFILE_TABS = ["posts", "replies", "media"];

export function validCursor(cursor) {
  return typeof cursor === "string" && cursor.length > 0 && cursor.length <= 2048 && /^[a-zA-Z0-9_+=/-]+$/.test(cursor);
}

export function profileOptions(query = {}) {
  return {
    tab: PROFILE_TABS.includes(query.tab) ? query.tab : "posts",
    cursor: validCursor(query.cursor) ? query.cursor : null,
    ...(/^\d{1,30}$/.test(String(query.user_id || query.userId || "")) ? { userId: String(query.user_id || query.userId) } : {})
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
  const { tab, cursor, userId } = profileOptions(options);
  const query = new URLSearchParams();
  if (tab !== "posts") query.set("tab", tab);
  if (cursor) query.set("cursor", cursor);
  if (userId) query.set("user_id", userId);
  return query.size ? `${path}?${query}` : path;
}

export async function getProfile(username, fetcher = fetch, userId) {
  if (!profilePath(username)) return { state: "not-found", user: null };
  const states = [];
  const endpoints = [`${API_BASE}/2/profile/${username}`];
  if (/^\d{1,30}$/.test(String(userId || ""))) endpoints.push(`${API_BASE}/2/profile/id:${userId}`);
  endpoints.push(`${API_BASE}/${username}`);
  for (const endpoint of endpoints) {
    const result = await fetchApi(endpoint, fetcher);
    states.push(result.state);
    const user = normalizeAuthor(result.data?.user);
    if (result.state === "ready" && user?.screen_name.toLowerCase() === username.toLowerCase()) return { state: "ready", user };
    if (result.state === "ready") states[states.length - 1] = "unavailable";
  }
  // A profile 404 can be transient. Public posts also carry the full author.
  const timeline = await fetchApi(timelineUrl(username), fetcher);
  states.push(timeline.state);
  const author = timelinePosts(timeline.data).map(post => post.author).find(user => user.screen_name.toLowerCase() === username.toLowerCase());
  if (author) return { state: "ready", user: author };
  return { state: states.every(state => state === "not-found") ? "not-found" : "unavailable", user: null };
}

export function timelinePosts(data) {
  if (!Array.isArray(data?.results)) return [];
  const seen = new Set();
  return data.results.flatMap(item => item?.type === "thread" && Array.isArray(item.statuses) ? item.statuses : [item])
    .map(post => normalizePost(post)).filter(post => {
      if (!post || !localPostUrl(post)) return false;
      const key = String(post.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function getTimeline(username, options = {}, fetcher = fetch) {
  const url = timelineUrl(username, options);
  if (!url) return { state: "unavailable", posts: [], nextCursor: null };
  let result = await fetchApi(url, fetcher);
  if ((result.state !== "ready" || !Array.isArray(result.data?.results)) && /^\d{1,30}$/.test(String(options.userId || ""))) {
    const fallback = new URL(url);
    fallback.pathname = fallback.pathname.replace(`/profile/${username}/`, `/profile/id:${options.userId}/`);
    result = await fetchApi(fallback.href, fetcher);
  }
  // A 404 here can mean an empty timeline, rather than a missing account.
  if (result.state === "not-found") return { state: "empty", posts: [], nextCursor: null };
  if (result.state !== "ready" || !Array.isArray(result.data?.results)) return { state: "unavailable", posts: [], nextCursor: null };
  const posts = timelinePosts(result.data);
  const bottom = result.data?.cursor?.bottom;
  return {
    state: posts.length ? "ready" : result.data.results.length ? "unavailable" : "empty", posts,
    nextCursor: posts.length && validCursor(bottom) && bottom !== options.cursor ? bottom : null
  };
}
