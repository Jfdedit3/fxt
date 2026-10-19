const API_BASE = "https://api.fxtwitter.com";
const USERNAME_RE = /^[a-zA-Z0-9_]{1,50}$/;
const STATUS_ID_RE = /^\d{1,30}$/;

export function validParams(username, id) {
  return USERNAME_RE.test(username) && STATUS_ID_RE.test(id);
}

export async function getPost(username, id) {
  if (!validParams(username, id)) return null;

  // Prefer FxTwitter API v2: its status.media.all represents the complete
  // attachment list. Fall back to the legacy endpoint if v2 is unavailable.
  const endpoints = [
    `${API_BASE}/2/status/${encodeURIComponent(id)}`,
    `${API_BASE}/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          // FxTwitter API v2 rejects requests without an identifiable User-Agent.
          "User-Agent": "FxtPreview/1.0 (+https://fxt-pi.vercel.app)"
        },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 60 }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const post =
        data?.status ||
        data?.tweet ||
        data?.data?.status ||
        data?.data?.tweet ||
        data?.data ||
        null;

      if (post && typeof post === "object" && post.media && typeof post.media === "object") {
        return post;
      }
      if (post && typeof post === "object") return post;
    } catch {
      // Try the next compatible endpoint.
    }
  }

  return null;
}

