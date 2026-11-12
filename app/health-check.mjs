import { getPostResult } from "./post-data.mjs";
import { getYouTubeResult } from "./youtube-data.mjs";
import { getYouTubeChannel } from "./youtube-channel-data.mjs";
export async function runHealthChecks(checks) {
  const tasks = checks || {
    x: async () => { const signal = AbortSignal.timeout(6500); const result = await getPostResult("jack", "20", (url, options) => fetch(url, { ...options, next: undefined, cache: "no-store", signal: AbortSignal.any([signal, options.signal]) })); return Boolean(result.post); },
    youtube_video: async () => { const result = await getYouTubeResult("watch", "jNQXAC9IVRw"); return Boolean(result.item && !result.stale); },
    youtube_post: async () => { const result = await getYouTubeResult("post", "UgkxvF-Ikos2vcUfuu-7iS9zo0eW2S7c5RYG"); return Boolean(result.item && result.item.images.length && !result.stale); },
    youtube_channel: async () => { const result = await getYouTubeChannel("@jawed"); return Boolean(result.channel && result.entries?.length && !result.stale); },
  };
  const results = await Promise.all(Object.entries(tasks).map(async ([service, check]) => { const started = Date.now(); let ok = false; try { ok = await check(); } catch { /* A failing source does not hide other checks. */ } return { service, status: ok ? "operational" : "degraded", latencyMs: Date.now() - started }; }));
  return { status: results.every(result => result.status === "operational") ? "operational" : "degraded", checkedAt: new Date().toISOString(), checks: results };
}
let saved, pending;
export function cachedHealth() {
  if (saved && Date.now() - saved.at < 60000) return Promise.resolve(saved.result);
  if (pending) return pending;
  pending = runHealthChecks().then(result => { saved = { at: Date.now(), result }; return result; }).finally(() => { pending = null; });
  return pending;
}
