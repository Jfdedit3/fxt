function escape(value) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function GET(request) {
  const value = new URL(request.url).searchParams.get("return") || "/";
  let target = "/";
  try {
    const url = new URL(value, "https://fxt.invalid");
    if (url.origin === "https://fxt.invalid" && /^\/[a-zA-Z0-9_]{1,50}(?:\/status\/\d{1,30}(?:\/player)?)?$/.test(url.pathname)) target = url.pathname + url.search;
  } catch { /* Use the home page for malformed return paths. */ }
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Temporarily unavailable | Fxt</title><style>body{background:#080910;color:#f4f5ff;font:16px system-ui;margin:0;min-height:100vh;display:grid;place-items:center}main{max-width:480px;padding:28px;line-height:1.8}a{color:#70e1f5;margin-right:20px}p{color:#979bad}</style></head><body><main><h1>Temporarily unavailable</h1><p>We couldn’t retrieve this profile or post right now. This does not mean the account or post has been deleted.</p><a href="${escape(target)}">Try again →</a><a href="/">Back to Fxt</a></main></body></html>`, {
    status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "30", "X-Robots-Tag": "noindex, nofollow" }
  });
}
