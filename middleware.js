import { NextResponse } from "next/server";

export function middleware(request) {
  if (!/Discordbot\//i.test(request.headers.get("user-agent") || "")) return NextResponse.next();
  const match = /^\/([a-zA-Z0-9_]{1,50})\/status\/(\d{1,30})\/?$/.exec(request.nextUrl.pathname);
  if (!match) return NextResponse.next();
  const target = request.nextUrl.clone();
  target.pathname = "/api/discord-preview";
  target.search = "";
  target.searchParams.set("username", match[1]);
  target.searchParams.set("id", match[2]);
  return NextResponse.rewrite(target);
}

export const config = { matcher: "/:username/status/:id" };
