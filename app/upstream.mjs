export async function fetchApi(url, fetcher = fetch) {
  let last = { state: "unavailable", data: null };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", "User-Agent": "FxtPreview/1.0 (+https://fxt-pi.vercel.app)" },
        signal: AbortSignal.timeout(4500),
        ...(process.env.FXT_E2E === "1" ? { cache: "no-store" } : { next: { revalidate: 60 } })
      });
      if (response.status === 204) return { state: "ready", data: { results: [] } };
      if (response.status === 400) { await response.body?.cancel(); return { state: "invalid", data: null }; }
      if (response.status === 404) { await response.body?.cancel(); return { state: "not-found", data: null }; }
      if (!response.ok) {
        await response.body?.cancel();
        last = { state: "unavailable", data: null };
        if (![429, 500, 502, 503, 504].includes(response.status)) return last;
        continue;
      }
      const data = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) return last;
      if (data.code === 404) return { state: "not-found", data: null };
      if (data.code !== undefined && data.code !== 200) return last;
      return { state: "ready", data };
    } catch { last = { state: "unavailable", data: null }; }
  }
  return last;
}
