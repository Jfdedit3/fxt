import test from "node:test";
import assert from "node:assert/strict";
import { cleanShareUrl, siteOrigin } from "../app/site-url.mjs";
test("copied and shared links are a single clean URL without whitespace or invisible characters", () => {
  const value = " \nhttps://fxt-pi.vercel.app \u200b/youtube/watch/jNQXAC9IVRw\r\n";
  assert.equal(cleanShareUrl(value), "https://fxt-pi.vercel.app/youtube/watch/jNQXAC9IVRw");
  assert.equal(siteOrigin({ NEXT_PUBLIC_SITE_URL: " https://fxt-pi.vercel.app/ \n" }), "https://fxt-pi.vercel.app");
  assert.equal(siteOrigin({ NEXT_PUBLIC_SITE_URL: "invalid", VERCEL_URL: "preview.vercel.app" }), "https://preview.vercel.app");
  assert.throws(() => cleanShareUrl("javascript:alert(1)")); assert.throws(() => cleanShareUrl("https://user:pass@example.com"));
});
