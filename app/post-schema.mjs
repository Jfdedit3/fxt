import { profilePath, textValue } from "./post-info.mjs";

export function normalizeAuthor(value) {
  if (!value || typeof value !== "object" || !profilePath(value.screen_name)) return null;
  return { ...value, name: textValue(value.name) || value.screen_name, description: textValue(value.description), location: textValue(value.location) };
}

export function normalizePost(value, expectedId, depth = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.type === "tombstone") return null;
  const id = String(value.id ?? "");
  const author = normalizeAuthor(value.author || value.user);
  if (!/^\d{1,30}$/.test(id) || (expectedId && id !== String(expectedId)) || !author) return null;
  let quote;
  if (depth < 1 && value.quote) quote = value.quote.type === "tombstone" ? { type: "tombstone" } : normalizePost(value.quote, undefined, depth + 1);
  return { ...value, id, author, quote: quote || undefined };
}
