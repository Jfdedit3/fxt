import test from "node:test";
import assert from "node:assert/strict";
import { createResourceGuard } from "../app/resource-limits.mjs";

test("per-client limits expire and concurrent slots are released exactly once", () => {
  let time = 0;
  const guard = createResourceGuard(() => time);
  assert.equal(guard.rate("gif", "client", 2).allowed, true);
  assert.equal(guard.rate("gif", "client", 2).allowed, true);
  assert.equal(guard.rate("gif", "client", 2).allowed, false);
  assert.equal(guard.rate("gif", "other", 2).allowed, true);
  time = 60001;
  assert.equal(guard.rate("gif", "client", 2).allowed, true);
  const release = guard.slot("gif", 1);
  assert.equal(guard.slot("gif", 1), null);
  release(); release();
  assert.equal(typeof guard.slot("gif", 1), "function");
});
