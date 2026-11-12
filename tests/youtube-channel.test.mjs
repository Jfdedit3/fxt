import test from "node:test";
import assert from "node:assert/strict";
import { normalizeYouTubeUrl } from "../app/youtube-url.mjs";
import { channelPath, channelRefFromUrl, decodeChannelRef } from "../app/youtube-channel-url.mjs";
import { parseYouTubeChannel, getYouTubeChannel } from "../app/youtube-channel-data.mjs";
const id = "UCaaaaaaaaaaaaaaaaaaaaaa";
const html = content => `var ytInitialData = ${JSON.stringify({ metadata: { channelMetadataRenderer: { title: "Creator", externalId: id, description: "Biography", vanityChannelUrl: "https://www.youtube.com/@Creator", avatar: { thumbnails: [{ url: "https://yt3.ggpht.com/avatar=s100" }] } } }, header: { pageHeaderRenderer: { content: { pageHeaderViewModel: { metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: "10 subscribers" } }, { text: { content: "2 videos" } }] }] } }, banner: { imageBannerViewModel: { image: { sources: [{ url: "https://yt3.ggpht.com/banner" }] } } } } } } }, contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { selected: true, content } }] } } })};`;
test("channel links accept IDs and handles, preserve selected tabs and reject unrelated URLs", () => {
  assert.equal(normalizeYouTubeUrl("https://youtube.com/@Creator/shorts?si=tracking"), "/youtube/channel/@Creator?tab=shorts");
  assert.equal(normalizeYouTubeUrl(`https://youtube.com/channel/${id}`), `/youtube/channel/${id}?tab=videos`);
  assert.equal(normalizeYouTubeUrl("https://youtube.com/@Créateur/community"), "/youtube/channel/@Cr%C3%A9ateur?tab=posts");
  assert.equal(decodeChannelRef("%40Creator"), "@Creator");
  assert.equal(decodeChannelRef("%40Cr%C3%A9ateur"), "@Créateur");
  assert.equal(channelPath("../watch"), null); assert.equal(channelRefFromUrl("https://youtube.com.evil.test/@Creator"), null);
});
test("modern channel profiles and video cards retain identity, banner, counts and feed order", () => {
  const card = { lockupViewModel: { contentId: "jNQXAC9IVRw", metadata: { lockupMetadataViewModel: { title: { content: "Video title" } } }, contentImage: { thumbnailViewModel: { image: { sources: [{ url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg" }] } } } } };
  const result = parseYouTubeChannel(html({ richGridRenderer: { contents: [card, card] } }), "@Creator");
  assert.equal(result.channel.id, id); assert.equal(result.channel.subscribers, "10 subscribers"); assert.equal(result.channel.banner, "https://yt3.ggpht.com/banner");
  assert.equal(result.entries.length, 1); assert.equal(result.entries[0].title, "Video title");
  assert.equal(parseYouTubeChannel(html({}), "UCbbbbbbbbbbbbbbbbbbbbbb").state, "unavailable");
});
test("channel post tabs do not treat a post's attached video as another channel upload", () => {
  const content = { contents: [{ backstagePostRenderer: { postId: "UgCommunityFixture123", contentText: { simpleText: "Post body" }, backstageAttachment: { videoRenderer: { videoId: "jNQXAC9IVRw" } } } }] };
  const result = parseYouTubeChannel(html(content), "@Creator", "posts");
  assert.deepEqual(result.entries.map(x => x.kind), ["post"]);
});
test("missing channels and source challenges retain separate states and invalid references make no fetch", async () => {
  let calls = 0;
  assert.equal((await getYouTubeChannel("../bad", "videos", async () => { calls++; })).state, "not-found"); assert.equal(calls, 0);
  assert.equal((await getYouTubeChannel("@Creator", "videos", async () => new Response("Consent"))).state, "unavailable");
  assert.equal((await getYouTubeChannel("@Creator", "videos", async () => new Response(null, { status: 404 }))).state, "not-found");
});


test("legacy channel redirects stay on YouTube channel routes and cannot become arbitrary fetches", async () => {
  let calls = 0;
  const result = await getYouTubeChannel("c~Legacy", "videos", async _url => {
    calls++; return calls === 1 ? new Response(null, { status: 301, headers: { location: "https://www.youtube.com/@Creator/videos" } }) : new Response(html({ richGridRenderer: { contents: [] } }));
  });
  assert.equal(result.state, "ready"); assert.equal(calls, 2);
  calls = 0;
  const bad = await getYouTubeChannel("user~Legacy", "videos", async () => { calls++; return new Response(null, { status: 302, headers: { location: "https://example.com/internal" } }); });
  assert.equal(bad.state, "unavailable"); assert.equal(calls, 1);
});
