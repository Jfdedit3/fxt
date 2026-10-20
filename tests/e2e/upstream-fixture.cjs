const original = globalThis.fetch;
const author = { id: "123456", screen_name: "HoldingNuts_3D", name: "HoldingNuts", description: "Public profile regression fixture", followers: 100, statuses: 3 };
const photo = { id: "2111273616495333805", author, text: "A public post", media: { photos: [{ type: "photo", url: "https://pbs.twimg.com/fixture.jpg" }] } };
const gif = { id: "2108712786863755502", author, text: "A legacy animation", extended_entities: { media: [{ type: "animated_gif", media_url_https: "https://pbs.twimg.com/poster.jpg", video_info: { variants: [{ content_type: "video/mp4", url: "https://video.twimg.com/tweet_video/fixture.mp4" }] } }] } };

globalThis.fetch = async function(input, options) {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!href.startsWith("https://api.fxtwitter.com/")) return original.call(this, input, options);
  const url = new URL(href);
  if (url.pathname.includes("TransientUser") || url.pathname.endsWith("/status/999999999999")) return new Response(null, { status: 503 });
  if (url.pathname === "/2/status/999999999999") return new Response(null, { status: 503 });
  if (url.pathname === "/2/profile/id:123456") return Response.json({ user: author });
  if (url.pathname === "/2/profile/HoldingNuts_3D" || url.pathname === "/HoldingNuts_3D") return new Response(null, { status: 404 });
  if (url.pathname.startsWith("/2/profile/HoldingNuts_3D/")) {
    const older = url.searchParams.has("cursor");
    return Response.json({ code: 200, results: older ? [{ ...photo, id: "2090937039155818869", text: "An older post" }] : [photo, photo, gif], cursor: older ? {} : { bottom: "olderCursor==" } });
  }
  if (url.pathname === `/2/status/${photo.id}` || url.pathname.endsWith(`/status/${photo.id}`)) return Response.json({ status: photo });
  if (url.pathname === `/2/status/${gif.id}` || url.pathname.endsWith(`/status/${gif.id}`)) return Response.json({ status: gif });
  return new Response(null, { status: 404 });
};
