export const validDiscordId = value => typeof value === "string" && /^\d{17,20}$/.test(value);
export const validInviteCode = value => typeof value === "string" && /^[A-Za-z0-9_-]{2,100}$/.test(value);
export function normalizeDiscordUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let url; try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "discord.gg") { const code = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1]; return validInviteCode(code) ? `/discord/invite/${code}` : null; }
  if (!["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"].includes(host)) return null;
  const match = /^\/(users|invite)\/([^/]+)\/?$/.exec(url.pathname);
  return match && (match[1] === "users" ? validDiscordId(match[2]) : validInviteCode(match[2])) ? `/discord/${match[1]}/${match[2]}` : null;
}
