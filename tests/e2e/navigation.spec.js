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
