import { createHash } from "node:crypto";

export function createResourceGuard(now = Date.now) {
  const windows = new Map();
  const active = new Map();
  return {
    rate(bucket, key, limit, duration = 60000) {
      const time = now();
      const id = `${bucket}:${key}`;
      let record = windows.get(id);
      if (!record || record.until <= time) {
        if (windows.size >= 10000) {
          for (const [name, entry] of windows) if (entry.until <= time) windows.delete(name);
          if (windows.size >= 10000 && !windows.has(id)) return { allowed: false, retryAfter: 60 };
        }
        record = { count: 0, until: time + duration };
        windows.set(id, record);
      }
      if (record.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((record.until - time) / 1000)) };
      record.count++;
      return { allowed: true, retryAfter: 0 };
    },
    slot(bucket, limit) {
      const count = active.get(bucket) || 0;
      if (count >= limit) return null;
      active.set(bucket, count + 1);
      let released = false;
      return () => { if (!released) { released = true; active.set(bucket, Math.max(0, (active.get(bucket) || 1) - 1)); } };
    }
  };
}

export const resourceGuard = createResourceGuard();

export function requestKey(request) {
  const address = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous";
  return createHash("sha256").update(address).digest("hex");
}

export function limitedResponse(retryAfter = 30) {
  return Response.json({ error: "Too many media requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } });
}
