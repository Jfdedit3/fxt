import { validDiscordId, validInviteCode } from "./discord-url.mjs";
import { limitedYouTubeText } from "./youtube-data.mjs";
const hash = value => typeof value === "string" && /^(?:a_)?[a-f0-9]{32}$/.test(value);
const number = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const badges = [[1, "Discord staff"], [2, "Partner"], [4, "HypeSquad"], [8, "Bug hunter"], [64, "Bravery"], [128, "Brilliance"], [256, "Balance"], [512, "Early supporter"], [16384, "Bug hunter"], [65536, "Verified bot"], [131072, "Early bot developer"], [4194304, "Active developer"]];
export function discordUser(user, presence = null) {
  if (!validDiscordId(user?.id) || typeof user.username !== "string") return null;
  const avatar = hash(user.avatar) ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "webp"}?size=256` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
  return { kind: "users", id: user.id, name: typeof user.global_name === "string" && user.global_name ? user.global_name : user.username, username: user.username, avatar, banner: hash(user.banner) ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.webp?size=1024` : null, bio: typeof user.bio === "string" ? user.bio.slice(0, 2000) : "", badges: badges.filter(([bit]) => (Number(user.public_flags) & bit) === bit).map(([, label]) => label), bot: user.bot === true, status: ["online", "idle", "dnd", "offline"].includes(presence?.discord_status) ? presence.discord_status : null, activity: presence?.activities?.find(value => value?.type === 0 && typeof value.name === "string")?.name?.slice(0, 200) || null, originalUrl: `https://discord.com/users/${user.id}` };
}
export function discordGuild(data, code) {
  const guild = data?.guild;
  if (!validDiscordId(guild?.id) || typeof guild.name !== "string") return null;
  return { kind: "invite", id: guild.id, code, name: guild.name, bio: typeof guild.description === "string" ? guild.description : "", avatar: hash(guild.icon) ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=256` : null, banner: hash(guild.banner) ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.webp?size=1024` : hash(guild.splash) ? `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.webp?size=1024` : null, members: number(data.approximate_member_count), online: number(data.approximate_presence_count), verified: Array.isArray(guild.features) && guild.features.includes("VERIFIED"), originalUrl: `https://discord.gg/${code}` };
}
const cached = new Map(), pending = new Map();
export async function getDiscordProfile(kind, id, fetcher = fetch, token = process.env.DISCORD_BOT_TOKEN) {
  if (!(kind === "users" ? validDiscordId(id) : kind === "invite" && validInviteCode(id))) return { state: "not-found", item: null };
  const shared = fetcher === fetch && process.env.FXT_E2E !== "1", key = `${kind}:${id}`, saved = cached.get(key);
  if (shared && saved && Date.now() - saved.at < 60000) return saved.result;
  if (shared && pending.has(key)) return pending.get(key);
  if (shared && pending.size >= 50) return { state: "unavailable", item: null };
  const signal = AbortSignal.timeout(6500);
  async function read(url, headers) { const response = await fetcher(url, { signal, redirect: "error", cache: "no-store", ...(headers ? { headers } : {}) }); if (!response.ok) { await response.body?.cancel(); return { status: response.status }; } return { status: 200, data: JSON.parse(await limitedYouTubeText(response, 1024 * 1024)) }; }
  const task = (async () => {
    try {
      if (kind === "invite") {
        const response = await read(`https://discord.com/api/v10/invites/${id}?with_counts=true&with_expiration=true`);
        if (response.status === 404) return { state: "not-found", item: null };
        const item = discordGuild(response.data, id); return { state: item ? "ready" : "unavailable", item };
      }
      if (token) {
        const response = await read(`https://discord.com/api/v10/users/${id}`, { Authorization: `Bot ${token}` });
        if (response.status === 404) return { state: "not-found", item: null };
        const item = discordUser(response.data); if (item?.id === id) return { state: "ready", item };
      }
      const response = await read(`https://api.lanyard.rest/v1/users/${id}`);
      if (response.status === 404 || response.data?.success === false) return { state: "restricted", item: null };
      const item = response.data?.success && discordUser(response.data.data?.discord_user, response.data.data);
      return { state: item && item.id === id ? "ready" : "unavailable", item: item && item.id === id ? item : null };
    } catch { return { state: "unavailable", item: null }; }
  })().then(result => { if (shared && result.state === "ready") { if (cached.size >= 100 && !cached.has(key)) cached.delete(cached.keys().next().value); cached.set(key, { at: Date.now(), result }); } return result; }).finally(() => { if (shared) pending.delete(key); });
  if (shared) pending.set(key, task); return task;
}
