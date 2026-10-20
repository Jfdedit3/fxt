import { fetchApi } from "./upstream.mjs";
import { normalizePost } from "./post-schema.mjs";

export function validParams(username, id) {
  return /^[a-zA-Z0-9_]{1,50}$/.test(username) && /^\d{1,30}$/.test(id);
}

export async function getPostResult(username, id, fetcher = fetch) {
  if (!validParams(username, id)) return { state: "not-found", post: null };
  const endpoints = [
    `https://api.fxtwitter.com/2/status/${encodeURIComponent(id)}`,
    `https://api.fxtwitter.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`
  ];
  const states = [];
  for (const endpoint of endpoints) {
    const result = await fetchApi(endpoint, fetcher);
    states.push(result.state);
    if (result.state === "invalid") {
      if (endpoint === endpoints[0]) return { state: "not-found", post: null };
      states[states.length - 1] = "not-found";
      continue;
    }
    if (result.state !== "ready") continue;
    const data = result.data;
    const post = [data.status, data.tweet, data.data?.status, data.data?.tweet, data.data].map(candidate => normalizePost(candidate, id)).find(Boolean);
    if (post) return { state: "ready", post };
    states[states.length - 1] = "unavailable";
  }
  return { state: states.every(state => state === "not-found") ? "not-found" : "unavailable", post: null };
}

export async function getPost(username, id, fetcher = fetch) {
  return (await getPostResult(username, id, fetcher)).post;
}
