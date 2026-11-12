const original = globalThis.fetch;
const author = { id: "123456", screen_name: "HoldingNuts_3D", name: "HoldingNuts", description: "Public profile regression fixture", followers: 100, statuses: 3 };
const photo = { id: "2111273616495333805", author, text: "A public post", media: { photos: [{ type: "photo", url: "https://pbs.twimg.com/fixture.jpg" }] } };
const gif = { id: "2108712786863755502", author, text: "A legacy animation", extended_entities: { media: [{ type: "animated_gif", media_url_https: "https://pbs.twimg.com/poster.jpg", video_info: { variants: [{ content_type: "video/mp4", url: "https://video.twimg.com/tweet_video/fixture.mp4" }] } }] } };

const fourVideos = { id: "2120247287821529191", author: { ...author, screen_name: "GodoffuryN", name: "Gallery author" }, text: "Four video regression fixture", media: { all: Array.from({ length: 4 }, (_value, index) => ({ type: "video", url: `https://video.twimg.com/amplify_video/gallery-${index + 1}.mp4`, thumbnail_url: `https://pbs.twimg.com/gallery-${index + 1}.jpg`, width: 854, height: 480 })) } };

const mixedMedia = { id: "1874143352154968122", author: { ...author, screen_name: "fever3D" }, text: "One video and three photos", media: { all: [{ type: "video", url: "https://video.twimg.com/amplify_video/mixed.mp4" }, ...[1, 2, 3].map(index => ({ type: "photo", url: `https://pbs.twimg.com/mixed-${index}.jpg?name=orig` }))] } };

globalThis.fetch = async function(input, options) {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (href === "https://yt3.ggpht.com/community-1=s640") return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });
  if (href.startsWith("https://www.youtube.com/")) {
    const url = new URL(href);
    if (url.pathname === "/youtubei/v1/browse") {
      const token = JSON.parse(options.body).continuation;
      if (token === "page-fail") return new Response(null, { status: 503 });
      const continuationItems = [{ videoRenderer: { videoId: "abcdefghijk", title: { simpleText: "Next channel video" } } }, { videoRenderer: { videoId: "jNQXAC9IVRw", title: { simpleText: "Duplicate video" } } }];
      return Response.json({ onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems } }] });
    }
    if (url.pathname === "/@MissingChannel/videos") return new Response(null, { status: 404 });
    if (url.pathname === "/@TransientChannel/videos") return new Response("Sign in to continue");
    if (/^\/(?:@[^/]+|channel\/UC[A-Za-z0-9_-]{22}|c\/[^/]+|user\/[^/]+)\/(videos|shorts|posts)$/.test(url.pathname)) {
      const tab = url.pathname.split("/").pop();
      const content = tab === "videos" ? { richGridRenderer: { contents: [{ richItemRenderer: { content: { videoRenderer: { videoId: "jNQXAC9IVRw", title: { simpleText: "Channel video" }, thumbnail: { thumbnails: [{ url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg" }] } } } } }] } } : tab === "shorts" ? { richGridRenderer: { contents: [{ shortsLockupViewModel: { onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: "jNQXAC9IVRw" } } }, overlayMetadata: { primaryText: { content: "Channel Short" } }, thumbnail: { sources: [{ url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg" }] } } }] } } : { sectionListRenderer: { contents: [{ backstagePostRenderer: { postId: "UgkxvF-Ikos2vcUfuu-7iS9zo0eW2S7c5RYG", authorText: { simpleText: "YouTube creator" }, contentText: { simpleText: "Channel community post" } } }] } };
      if (tab === "videos") content.richGridRenderer.contents.push({ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: "page2" } } } });
      return new Response(`ytcfg.set({"INNERTUBE_CONTEXT":{"client":{"clientVersion":"2.20261112.00.00"}}}); var ytInitialData = ${JSON.stringify({ metadata: { channelMetadataRenderer: { externalId: "UCaaaaaaaaaaaaaaaaaaaaaa", title: "YouTube creator", description: "Public creator channel", vanityChannelUrl: "https://www.youtube.com/@FixtureCreator", avatar: { thumbnails: [{ url: "https://yt3.ggpht.com/avatar=s100" }] } } }, header: { c4TabbedHeaderRenderer: { subscriberCountText: { simpleText: "123 subscribers" }, videosCountText: { simpleText: "3 videos" }, banner: { thumbnails: [{ url: "https://yt3.ggpht.com/banner=w1000" }] } } }, contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { selected: true, content } }] } } })};`);
    }
    if (url.pathname.includes("UgMissingPost12345")) return new Response(null, { status: 404 });
    if (url.pathname.includes("UgTransientPost123")) return new Response("Sign in to continue");
    if (url.pathname.startsWith("/post/")) return new Response(`var ytInitialData = ${JSON.stringify({ contents: { backstagePostRenderer: { postId: url.pathname.split("/").pop(), authorText: { simpleText: "YouTube creator" }, authorEndpoint: { browseEndpoint: { browseId: "UCaaaaaaaaaaaaaaaaaaaaaa" } }, contentText: { runs: [{ text: "Community gallery fixture" }] }, backstageAttachment: { postMultiImageRenderer: { images: [1, 2, 3].map(index => ({ backstageImageRenderer: { image: { thumbnails: [{ url: `https://yt3.ggpht.com/community-${index}=s640` }] } } })) } } } } })};`);
    if (url.pathname === "/watch") return new Response(`var ytInitialPlayerResponse = ${JSON.stringify({ microformat: { playerMicroformatRenderer: { publishDate: "2025-01-02" } }, videoDetails: { videoId: url.searchParams.get("v"), title: "YouTube video fixture", author: "YouTube creator", shortDescription: "Video description", viewCount: "123", lengthSeconds: "61", likeCount: "12", channelId: "UCaaaaaaaaaaaaaaaaaaaaaa", thumbnail: { thumbnails: [{ url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg" }] } } })};`);
  }
  if (!href.startsWith("https://api.fxtwitter.com/")) return original.call(this, input, options);
  const url = new URL(href);
  if (url.pathname === "/2/status/20") return Response.json({ status: { id: "20", author: { screen_name: "jack", name: "Jack" }, text: "Public source check" } });
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
