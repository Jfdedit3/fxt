import { NextResponse } from "next/server";

export function middleware(request) {
  const handle = /^\/(@[^/]+)(?:\/(videos|shorts|posts|community))?\/?$/.exec(request.nextUrl.pathname);
  if (handle) {
    const target = request.nextUrl.clone(); target.pathname = `/youtube/channel/${handle[1]}`; target.search = "";
    if (handle[2]) target.searchParams.set("tab", handle[2] === "community" ? "posts" : handle[2]);
    return NextResponse.redirect(target);
  }
  if (!/Discordbot\//i.test(request.headers.get("user-agent") || "")) return NextResponse.next();
  const youtube = /^\/youtube\/(post|watch|shorts)\/([A-Za-z0-9_-]+)\/?$/.exec(request.nextUrl.pathname);
  if (youtube) {
    const target = request.nextUrl.clone(); target.pathname = "/api/youtube-preview"; target.search = "";
    target.searchParams.set("kind", youtube[1]); target.searchParams.set("id", youtube[2]);
    return NextResponse.rewrite(target);
  }
  const match = /^\/([a-zA-Z0-9_]{1,50})\/status\/(\d{1,30})\/?$/.exec(request.nextUrl.pathname);
  if (!match) return NextResponse.next();
  const target = request.nextUrl.clone();
  target.pathname = "/api/discord-preview";
  target.search = "";
  target.searchParams.set("username", match[1]);
  target.searchParams.set("id", match[2]);
  return NextResponse.rewrite(target);
}

export const config = { matcher: ["/:username/status/:id", "/youtube/:kind/:id", "/:handle", "/:handle/:tab"] };
