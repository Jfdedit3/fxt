export function siteOrigin(env = process.env) {
  for (const value of [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_URL && `https://${env.VERCEL_URL}`, "http://localhost:3000"]) {
    try { const url = new URL(value?.trim()); if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return url.origin; } catch { /* Try the next configured origin. */ }
  }
}
export function cleanShareUrl(value) {
  const url = new URL(String(value).replace(/[\s\u200B-\u200D\uFEFF]/gu, ""));
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw Error("Invalid share URL");
  return url.href;
}
