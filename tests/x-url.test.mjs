import test from "node:test";
import assert from "node:assert/strict";
import { normalizeXUrl } from "../app/x-url.mjs";

test("the profile URL shown in the screenshot opens its Fxt profile", () => {
  for (const url of ["https://x.com/HoldingNuts_3D", "x.com/HoldingNuts_3D/", " https://www.twitter.com/HoldingNuts_3D?s=21 ", "https://mobile.x.com/HoldingNuts_3D"]) {
    assert.equal(normalizeXUrl(url), "/HoldingNuts_3D");
  }
});

test("post URLs retain their destination including image/video sharing suffixes", () => {
  assert.equal(normalizeXUrl("https://x.com/DarkPatchesArt/status/2111942446917816747?s=20"), "/DarkPatchesArt/status/2111942446917816747");
  assert.equal(normalizeXUrl("twitter.com/user/status/123/photo/2"), "/user/status/123");
  assert.equal(normalizeXUrl("https://mobile.twitter.com/user/status/123/video/1"), "/user/status/123");
});

test("unrelated, malformed and non-profile X URLs remain invalid", () => {
  for (const url of ["", null, "https://example.com/user", "https://x.com.evil.test/user", "https://evil.test@x.com/user", "https://x.com/bad-name", "https://x.com/user/status/123abc", "https://x.com/user/status/123/extra", "https://x.com/home", "https://x.com/i", "javascript:alert(1)"]) {
    assert.equal(normalizeXUrl(url), null, String(url));
  }
});
