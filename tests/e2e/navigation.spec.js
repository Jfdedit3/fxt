import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => ["image", "media", "font"].includes(route.request().resourceType()) || new URL(route.request().url()).hostname === "fonts.googleapis.com" ? route.abort() : route.continue());
});

test("HoldingNuts_3D profile survives false upstream 404s, deduplicates and paginates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("https://x.com/HoldingNuts_3D");
  await page.getByRole("button", { name: "Open link" }).click();
  await expect(page.locator(".profileHandle")).toHaveText("@HoldingNuts_3D");
  await expect(page.locator(".feedPost")).toHaveCount(2);
  await expect(page.locator("video")).toHaveAttribute("src", /fixture\.mp4/);
  await page.getByRole("link", { name: "Load older posts" }).click();
  await expect(page.locator(".feedPost")).toHaveCount(1);
  await expect(page.locator(".feedText")).toContainText("An older post");
  await page.getByRole("link", { name: "Media", exact: true }).click();
  await expect(page.locator('.profileTabs a[aria-current="page"]')).toHaveText("Media");
  await expect(page.locator(".feedPost")).toHaveCount(2);
});

test("anonymous X links open a post and avatars return to the profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("https://x.com/i/web/status/2111273616495333805");
  await page.getByRole("button", { name: "Open link" }).click();
  await expect(page.locator(".postCard .authorProfileLink")).toContainText("HoldingNuts");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /HoldingNuts_3D\/status\/2111273616495333805$/);
  await page.locator(".postCard .avatarLink").click();
  await expect(page.locator(".profileHandle")).toHaveText("@HoldingNuts_3D");
});

test("missing posts and profiles have real 404 responses", async ({ page }) => {
  const post = await page.goto("/HoldingNuts_3D/status/1");
  expect(post.status()).toBe(404);
  const profile = await page.goto("/MissingUser");
  expect(profile.status()).toBe(404);
});

test("temporary upstream failures reach a friendly non-indexable 503 page", async ({ page }) => {
  const response = await page.goto("/TransientUser");
  expect(response.status()).toBe(503);
  await expect(page.getByRole("heading", { name: "Temporarily unavailable" })).toBeVisible();
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const post = await page.goto("/HoldingNuts_3D/status/999999999999");
  expect(post.status()).toBe(503);
});


test("one normal post URL exposes a server-rendered Discord gallery with four videos", async ({ request }) => {
  const response = await request.get("/GodoffuryN/status/2120247287821529191", { headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" } });
  expect(response.status()).toBe(200);
  const html = await response.text();
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  expect(head).toBeTruthy();
  const link = head.match(/<link\b[^>]*rel="discord:component-embed"[^>]*>/i)?.[0];
  expect(link).toBeTruthy();
  const href = link.match(/href="([^"]+)"/)?.[1];
  expect(new URL(href).origin).toBe(new URL(response.url()).origin);
  const payloadResponse = await request.get(href, { headers: { "User-Agent": "Discordbot/2.0" } });
  expect(payloadResponse.status()).toBe(200);
  const text = await payloadResponse.text();
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(3000);
  const payload = JSON.parse(text);
  expect(payload.component.type).toBe(17);
  const gallery = payload.component.components.find(component => component.type === 12);
  expect(gallery.items.map(item => item.media.url)).toEqual([1, 2, 3, 4].map(number => `https://video.twimg.com/amplify_video/gallery-${number}.mp4`));
  expect(head).toContain('property="og:video"');
  expect(head).toContain('name="twitter:card" content="player"');
});

test("single-video previews keep their fallback and missing component data is not cached", async ({ request }) => {
  const response = await request.get("/HoldingNuts_3D/status/2108712786863755502", { headers: { "User-Agent": "Discordbot/2.0" } });
  expect(await response.text()).not.toContain('rel="discord:component-embed"');
  const absent = await request.get("/HoldingNuts_3D/status/1/discord.json");
  expect(absent.status()).toBe(404);
  expect(absent.headers()["cache-control"]).toBe("no-store");
  const transient = await request.get("/TransientUser/status/999999999999/discord.json");
  expect(transient.status()).toBe(503);
});
