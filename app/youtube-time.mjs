export function startSeconds(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 && value <= 604800 ? value : null;
  if (typeof value !== "string" || value.length > 30) return null;
  let seconds;
  if (/^\d+$/.test(value)) seconds = Number(value);
  else if (/^(?:\d+h)?(?:\d+m)?(?:\d+s)?$/i.test(value) && value) { const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value); seconds = Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0); }
  else if (/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value)) seconds = value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  return Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 604800 ? seconds : null;
}
export function youtubeStart(url) { return startSeconds(url.searchParams.get("t") || url.searchParams.get("start") || url.searchParams.get("time_continue") || /^#t=(.+)$/.exec(url.hash)?.[1]); }
export const timeQuery = value => startSeconds(value) ? `?t=${startSeconds(value)}` : "";
export function originalAtTime(value, start) { const url = new URL(value); const seconds = startSeconds(start); if (seconds) url.searchParams.set("t", String(seconds)); return url.href; }
