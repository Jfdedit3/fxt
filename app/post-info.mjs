export function textValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function postText(post) {
  return textValue(post?.text) || textValue(post?.raw_text?.text) ||
    textValue(post?.raw_text) || textValue(post?.description);
}

export function safeExternalUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function countValue(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function formatCount(value) {
  const number = countValue(value);
  return number === null ? null : new Intl.NumberFormat("en").format(number);
}

export function postStats(post) {
  return [
    ["likes", "Likes"], ["reposts", "Reposts"], ["replies", "Replies"],
    ["quotes", "Quotes"], ["bookmarks", "Bookmarks"], ["views", "Views"]
  ].flatMap(([key, label]) => {
    const value = countValue(post?.[key]);
    return value === null ? [] : [{ key, label, value }];
  });
}

export function metadataDescription(post, username) {
  const stats = postStats(post).map(({ label, value }) => `${formatCount(value)} ${label.toLowerCase()}`).join(" · ");
  const text = postText(post) || `View the original post by @${username} on X.`;
  const suffix = stats ? `\n${stats}` : "";
  const room = Math.max(0, 300 - suffix.length);
  return `${text.length > room ? text.slice(0, Math.max(0, room - 1)) + "…" : text}${suffix}`.slice(0, 300);
}

export function localPostUrl(post) {
  const username = post?.author?.screen_name || post?.user?.screen_name;
  const id = post?.id;
  return typeof username === "string" && /^[a-zA-Z0-9_]{1,50}$/.test(username) &&
    /^\d{1,30}$/.test(String(id)) ? `/${username}/status/${id}` : null;
}

export function replyContext(post) {
  const reply = post?.replying_to;
  const handle = textValue(typeof reply === "object" ? reply?.screen_name : reply);
  const id = typeof reply === "object" ? reply?.status : post?.replying_to_status;
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(handle)) return null;
  return { handle, href: /^\d{1,30}$/.test(String(id)) ? `/${handle}/status/${id}` : `https://x.com/${handle}` };
}

export function pollChoices(poll) {
  if (!Array.isArray(poll?.choices)) return [];
  const choices = poll.choices.filter(choice => textValue(choice?.label));
  const total = countValue(poll.total_votes) ?? choices.reduce((sum, choice) => sum + (countValue(choice.count) ?? 0), 0);
  return choices.map(choice => {
    const count = countValue(choice.count);
    const supplied = typeof choice.percentage === "number" && Number.isFinite(choice.percentage) ? choice.percentage : null;
    const percent = supplied ?? (count !== null && total > 0 ? count / total * 100 : 0);
    return { label: choice.label, count, percent: Math.min(100, Math.max(0, percent)) };
  });
}
