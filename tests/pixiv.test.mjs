import test from "node:test";
import assert from "node:assert/strict";
import { normalizePixivUrl, pixivImageSource } from "../app/pixiv-url.mjs";
import { pixivText, parsePixivArtwork, parsePhixivArtwork, getPixivArtwork, getPixivUser, phixivStatusId } from "../app/pixiv-data.mjs";
import { pixivComponent, pixivPanels } from "../app/pixiv-preview.mjs";
import { servePixivImage } from "../app/pixiv-images.mjs";
const id = "109546448";
const image = page => `https://i.pximg.net/img-master/img/2023/07/02/17/06/08/${id}_p${page}_master1200.jpg`;
const pages = count => Array.from({ length: count }, (_value, index) => ({ urls: { regular: image(index), original: image(index) }, width: 800, height: 1200 }));
const detail = { illustId: id, illustTitle: "An illustration", userId: "69634878", userName: "Artist", description: "Text<br>line &amp; test<script>bad()</script>", pageCount: 12, tags: { tags: [{ tag: "R-18" }] }, xRestrict: 1 };
test("Pixiv artwork and profile URL formats are accepted without tracking or lookalike hosts", () => {
  for (const url of [`https://www.pixiv.net/en/artworks/${id}?tracking=1`, `pixiv.net/artworks/${id}`, `https://www.pixiv.net/member_illust.php?mode=medium&illust_id=${id}`]) assert.equal(normalizePixivUrl(url), `/pixiv/artworks/${id}`);
  assert.equal(normalizePixivUrl("https://www.pixiv.net/users/69634878/artworks"), "/pixiv/users/69634878");
  for (const url of ["https://pixiv.net.evil.test/artworks/123", "https://user@pixiv.net/artworks/123", "https://pixiv.net:444/artworks/123", "https://pixiv.net/artworks/../"]) assert.equal(normalizePixivUrl(url), null);
  assert.equal(pixivImageSource("https://i.pximg.net.evil.test/img-master/a.jpg"), null);
});
test("Pixiv metadata safely decodes text and preserves every photo and spoiler flag", () => {
  const item = parsePixivArtwork(detail, pages(12), id); assert.equal(item.images.length, 12); assert.equal(item.sensitive, true); assert.equal(item.description, "Text\nline & test");
  assert.equal(parsePixivArtwork({ ...detail, illustId: "123" }, pages(12), id), null);
  const payload = JSON.parse(pixivComponent(item, "https://fxt.test")); assert.equal(payload.component.spoiler, true); assert.equal(payload.component.components.find(c => c.type === 12).items.length, 3);
  assert.equal(pixivPanels({ ...item, images: pages(56).map(p => ({ regular: p.urls.regular })) }).length, 10);
  assert.equal(pixivText('&lt;img src=x onerror=alert(1)&gt;'), '<img src=x onerror=alert(1)>');
});
test("documented Phixiv fallback verifies artwork identity and reconstructs uniform page URLs from first and last pages", () => {
  const make = index => ({ id, account: { id: "69634878", display_name: "Artist" }, content: '<strong><a href="x">Title</a></strong><br>By Artist #R-18', media_attachments: [{ type: "image", url: image(index).replace('https://i.pximg.net/', 'https://www.phixiv.net/i/') }] });
  const item = parsePhixivArtwork(make(0), make(55), id); assert.equal(item.images.length, 56); assert.equal(item.complete, true); assert.equal(item.likes, null); assert.equal(item.sensitive, true);
  assert.equal(parsePhixivArtwork(make(0), { ...make(55), id: "1671" }, id), null);
  assert.equal(phixivStatusId(id, 0, 2), "144403842288582656");
});
test("direct Pixiv reads and source failures are distinct, with verified author fallback for restricted profiles", async () => {
  const fetcher = async url => String(url).includes(`/illust/${id}/pages`) ? Response.json({ error: false, body: pages(12) }) : Response.json({ error: false, body: detail });
  assert.equal((await getPixivArtwork(id, fetcher)).item.images.length, 12);
  assert.equal((await getPixivArtwork("bad", fetcher)).state, "not-found");
  assert.equal((await getPixivArtwork(id, async () => new Response(null, { status: 404 }))).state, "not-found");
  assert.equal((await getPixivArtwork(id, async () => new Response(null, { status: 503 }))).state, "unavailable");
  const user = await getPixivUser("69634878", id, async url => String(url).includes('/ajax/user/') ? new Response(null, { status: 403 }) : fetcher(url));
  assert.equal(user.user.name, "Artist"); assert.equal(user.user.limited, true);
  assert.equal((await getPixivUser("999", id, async url => String(url).includes('/ajax/user/') ? new Response(null, { status: 403 }) : fetcher(url))).user, null);
});
test("Pixiv image relay supplies required provenance and safe inline or attachment responses", async () => {
  const request = new Request("https://fxt.test/api/pixiv-image?url=" + encodeURIComponent(image(0)) + "&download=1");
  const response = await servePixivImage(request, async (_url, options) => { assert.equal(options.headers.Referer, "https://www.pixiv.net/"); assert.equal(options.redirect, "error"); return new Response(new Uint8Array([255,216,255]), { headers: { "Content-Type": "image/jpeg" } }); });
  assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /attachment/);
  assert.equal((await servePixivImage(new Request("https://fxt.test/api/pixiv-image?url=https://example.com/secret"))).status, 400);
});
