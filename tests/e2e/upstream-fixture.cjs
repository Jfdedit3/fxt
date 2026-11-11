const original = globalThis.fetch;
const author = { id: "123456", screen_name: "HoldingNuts_3D", name: "HoldingNuts", description: "Public profile regression fixture", followers: 100, statuses: 3 };
const photo = { id: "2111273616495333805", author, text: "A public post", media: { photos: [{ type: "photo", url: "https://pbs.twimg.com/fixture.jpg" }] } };
const gif = { id: "2108712786863755502", author, text: "A legacy animation", extended_entities: { media: [{ type: "animated_gif", media_url_https: "https://pbs.twimg.com/poster.jpg", video_info: { variants: [{ content_type: "video/mp4", url: "https://video.twimg.com/tweet_video/fixture.mp4" }] } }] } };

const fourVideos = { id: "2120247287821529191", author: { ...author, screen_name: "GodoffuryN", name: "Gallery author" }, text: "Four video regression fixture", media: { all: Array.from({ length: 4 }, (_value, index) => ({ type: "video", url: `https://video.twimg.com/amplify_video/gallery-${index + 1}.mp4`, thumbnail_url: `https://pbs.twimg.com/gallery-${index + 1}.jpg`, width: 854, height: 480 })) } };

const mixedMedia = { id: "1874137920996860413", author: { ...author, screen_name: "fever3D" }, text: "One video and three photos", media: { all: [{ type: "video", url: "https://video.twimg.com/amplify_video/mixed.mp4" }, ...[1, 2, 3].map(index => ({ type: "photo", url: `https://pbs.twimg.com/mixed-${index}.jpg?name=orig` }))] } };

globalThis.fetch = async function(input, options) {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!href.startsWith("https://api.fxtwitter.com/")) return original.call(this, input, options);
  const url = new URL(href);
  if (url.pathname === `/2/status/${mixedMedia.id}`) return Response.json({ status: mixedMedia });
  if (url.pathname === `/2/status/${fourVideos.id}`) return Response.json({ status: fourVideos });
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
