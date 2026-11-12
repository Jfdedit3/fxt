import test from "node:test";
import assert from "node:assert/strict";
import { translate, durationLabel } from "../app/i18n.mjs";
test("interface translation preserves source text and unknown labels", () => {
  assert.equal(translate("fr", "Share"), "Partager"); assert.equal(translate("en", "Share"), "Share"); assert.equal(translate("fr", "Creator supplied text"), "Creator supplied text");
  assert.equal(durationLabel(3661), "1:01:01"); assert.equal(durationLabel(61), "1:01"); assert.equal(durationLabel(undefined), null);
});
