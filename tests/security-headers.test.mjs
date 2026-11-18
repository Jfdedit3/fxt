import test from "node:test";
import assert from "node:assert/strict";
import config from "../next.config.mjs";

test("global response headers prevent MIME sniffing and framing", async () => {
  const rules = await config.headers();
  const global = rules.find((rule) => rule.source === "/:path*");
  assert.ok(global, "a global header rule must exist");
  const headers = Object.fromEntries(global.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");
  assert.match(headers["permissions-policy"], /camera=\(\)/);
  assert.match(headers["strict-transport-security"], /max-age=\d+/);
});
