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


for (const example of [
  { path: "/GodoffuryN/status/2120247287821529191", urls: [1, 2, 3, 4].map(number => `https://video.twimg.com/amplify_video/gallery-${number}.mp4`) },
  { path: "/fever3D/status/1874143352154968122", urls: ["https://video.twimg.com/amplify_video/mixed.mp4", ...[1, 2, 3].map(number => `https://pbs.twimg.com/mixed-${number}.jpg?name=orig`)] }
]) test(`one normal post URL exposes all Discord media for ${example.path}`, async ({ request }) => {
  const response = await request.get(example.path, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" } });
  expect(response.status()).toBe(200);
  const html = await response.text();
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  expect(head).toBeTruthy();
  const text = head.match(/<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  expect(text).toBeTruthy();
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(3000);
  const payload = JSON.parse(text);
  expect(payload.component.type).toBe(17);
  const gallery = payload.component.components.find(component => component.type === 12);
  expect(gallery.items.map(item => item.media.url)).toEqual(example.urls);
  expect(head).not.toContain('property="og:video"');
  expect(head).not.toContain('name="twitter:card" content="player"');
  expect(response.headers()["cache-control"]).toContain("no-store");
  // The very same URL continues to serve the interactive site to people.
  const browser = await request.get(example.path, { headers: { "User-Agent": "Mozilla/5.0" } });
  expect(await browser.text()).toContain('class="postCard"');
});

test("single-video previews keep their fallback and missing component data is not cached", async ({ request }) => {
  const response = await request.get("/HoldingNuts_3D/status/2108712786863755502", { headers: { "User-Agent": "Discordbot/2.0" } });
  const html = await response.text();
  expect(html).not.toContain('id="discord:component-embed"');
  expect(html).toContain('property="og:video"');
  expect(html).toContain('name="twitter:card" content="player"');
  const missingPost = await request.get("/HoldingNuts_3D/status/1", { headers: { "User-Agent": "Discordbot/2.0" } });
  expect(missingPost.status()).toBe(404);
  const unavailablePost = await request.get("/TransientUser/status/999999999999", { headers: { "User-Agent": "Discordbot/2.0" } });
  expect(unavailablePost.status()).toBe(503);
  const absent = await request.get("/HoldingNuts_3D/status/1/discord.json");
  expect(absent.status()).toBe(404);
  expect(absent.headers()["cache-control"]).toBe("no-store");
  const transient = await request.get("/TransientUser/status/999999999999/discord.json");
  expect(transient.status()).toBe(503);
});


test("YouTube community links open a gallery and expose all images inline to Discord", async ({ page, request }) => {
  const id = "UgkxvF-Ikos2vcUfuu-7iS9zo0eW2S7c5RYG";
  await page.goto("/");
  await page.getByRole("textbox").fill(`https://youtube.com/post/${id}?surface=shorts&data=tracking`);
  await page.getByRole("button", { name: "Open link" }).click();
  await expect(page).toHaveURL(new RegExp(`/youtube/post/${id}$`));
  await expect(page.locator(".postCard .postMedia")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "YouTube creator" })).toBeVisible();
  const response = await request.get(`/youtube/post/${id}`, { headers: { "User-Agent": "Discordbot/2.0" } });
  expect(response.status()).toBe(200);
  const head = (await response.text()).match(/<head>([\s\S]*?)<\/head>/)[1];
  const json = head.match(/<script id="discord:component-embed" type="application\/json">([\s\S]*?)<\/script>/)[1];
  expect(JSON.parse(json).component.components.find(c => c.type === 12).items).toHaveLength(3);
  expect(Buffer.byteLength(json)).toBeLessThanOrEqual(3000);
});

for (const kind of ["watch", "shorts"]) test(`YouTube ${kind} has an official browser player and a Discord player preview`, async ({ page, request }) => {
  await page.goto(`/youtube/${kind}/jNQXAC9IVRw`);
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw");
  await expect(page.getByRole("heading", { name: "YouTube video fixture" })).toBeVisible();
  const response = await request.get(`/youtube/${kind}/jNQXAC9IVRw`, { headers: { "User-Agent": "Discordbot/2.0" } });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('property="og:video" content="https://www.youtube.com/embed/jNQXAC9IVRw"');
});

test("YouTube missing and temporary failures have distinct HTTP responses", async ({ request }) => {
  const headers = { "User-Agent": "Discordbot/2.0" };
  expect((await request.get("/youtube/post/UgMissingPost12345", { headers })).status()).toBe(404);
  const temporary = await request.get("/youtube/post/UgTransientPost123", { headers });
  expect(temporary.status()).toBe(503);
  expect(temporary.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/youtube/watch/invalid")).status()).toBe(404);
});


test("language choice persists across navigation and reload, and can return to English", async ({ page }) => {
  await page.goto("/");
  await page.locator("#site-language").selectOption("fr");
  await expect(page.getByRole("button", { name: "Ouvrir le lien" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("textbox").fill("https://youtube.com/watch?v=jNQXAC9IVRw");
  await page.getByRole("button", { name: "Ouvrir le lien" }).click();
  await expect(page.getByRole("button", { name: "Partager" })).toBeVisible();
  await expect(page.locator(".postCard")).toContainText("Durée: 1:01");
  await expect(page.locator(".postCard")).toContainText("12 J’aime");
  await page.reload();
  await expect(page.locator("#site-language")).toHaveValue("fr");
  await page.locator("#site-language").selectOption("en");
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(page.locator(".postCard")).toContainText("Duration: 1:01");
});

test("YouTube domain replacement links resolve to the same pages and Discord galleries", async ({ request }) => {
  const id = "UgkxvF-Ikos2vcUfuu-7iS9zo0eW2S7c5RYG";
  const headers = { "User-Agent": "Discordbot/2.0" };
  const post = await request.get(`/post/${id}?surface=shorts&data=tracking`, { headers });
  expect(post.status()).toBe(200);
  expect(await post.text()).toContain('id="discord:component-embed"');
  const video = await request.get("/watch?v=jNQXAC9IVRw&si=tracking", { headers });
  expect(new URL(video.url()).pathname).toBe("/youtube/watch/jNQXAC9IVRw");
  expect(new URL(video.url()).search).toBe("");
  const short = await request.get("/shorts/jNQXAC9IVRw", { headers });
  expect(short.status()).toBe(200);
  expect(await short.text()).toContain("https://www.youtube.com/embed/jNQXAC9IVRw");
  expect((await request.get("/watch?v=invalid")).status()).toBe(404);
});

test("mobile galleries enlarge images, navigate with keyboard and download a real attachment", async ({ page, request }) => {
  await page.goto("/post/UgkxvF-Ikos2vcUfuu-7iS9zo0eW2S7c5RYG");
  await page.getByRole("button", { name: "Open image 1", exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await expect(dialog.locator("img")).toHaveAttribute("src", /community-1/);
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("img")).toHaveAttribute("src", /community-2/);
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  const download = await request.get("/api/image?url=" + encodeURIComponent("https://yt3.ggpht.com/community-1=s640"));
  expect(download.status()).toBe(200);
  expect(download.headers()["content-disposition"]).toContain('attachment; filename="fxt-image.png"');
  expect((await request.get("/api/image?url=https://example.com/secret")).status()).toBe(400);
});

test("mobile sharing uses the current Fxt URL and unavailable pages translate safely", async ({ page, request }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: async data => { window.sharedPost = data; }, configurable: true }); });
  await page.goto("/youtube/watch/jNQXAC9IVRw");
  await page.getByRole("button", { name: "Share" }).click();
  expect(await page.evaluate(() => window.sharedPost.url)).toContain("/youtube/watch/jNQXAC9IVRw");
  const unavailable = await request.get("/unavailable?return=%2Fyoutube%2Fwatch%2FjNQXAC9IVRw&lang=fr");
  expect(unavailable.status()).toBe(503);
  expect(await unavailable.text()).toContain("Temporairement indisponible");
  expect(await unavailable.text()).toContain("https://www.youtube.com/watch?v=jNQXAC9IVRw");
});

test("YouTube author links open a channel profile with videos, Shorts and community tabs", async ({ page }) => {
  await page.goto("/youtube/watch/jNQXAC9IVRw");
  await page.locator(".youtubeAuthor").click();
  await expect(page.getByRole("heading", { name: "YouTube creator", exact: true })).toBeVisible();
  await expect(page.locator(".profileAvatar")).toHaveAttribute("src", /avatar/);
  await expect(page.locator(".channelCounts")).toContainText("123 subscribers");
  await page.getByRole("link", { name: "Shorts", exact: true }).click();
  await expect(page.locator(".channelEntry h2")).toHaveText("Channel Short");
  await page.getByRole("link", { name: "Community posts", exact: true }).click();
  await expect(page.locator(".channelEntry h2")).toHaveText("Channel community post");
  await page.locator(".channelEntry a").click();
  await expect(page.locator(".youtubeAuthor")).toContainText("YouTube creator");
});

test("YouTube handles convert from the home page and direct aliases resolve", async ({ page, request }) => {
  await page.goto("/"); await page.getByRole("textbox").fill("https://youtube.com/@FixtureCreator");
  await page.getByRole("button", { name: "Open link" }).click();
  await expect(page.locator(".profileHandle")).toHaveText("@FixtureCreator");
  expect((await request.get("/@FixtureCreator")).status()).toBe(200);
  expect((await request.get("/channel/UCaaaaaaaaaaaaaaaaaaaaaa")).status()).toBe(200);
  expect((await request.get("/youtube/channel/@MissingChannel")).status()).toBe(404);
  expect((await request.get("/youtube/channel/@TransientChannel")).status()).toBe(503);
});

test("copy writes a single URL without whitespace or invisible characters to the clipboard", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.copiedFxt = text; } } }); });
  await page.goto("/youtube/watch/jNQXAC9IVRw");
  await page.getByRole("button", { name: "Copy Fxt link" }).click();
  const value = await page.evaluate(() => window.copiedFxt);
  expect(value).toMatch(/^https?:\/\/[^\s]+\/youtube\/watch\/jNQXAC9IVRw$/);
  expect(value).not.toMatch(/[\s\u200b-\u200d\ufeff]/);
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
});
