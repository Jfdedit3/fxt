import { notFound, redirect } from "next/navigation";
import { channelPath, validChannelRef } from "../../youtube-channel-url.mjs";
export default async function ChannelAlias({ params }) {
  const { id } = await params;
  if (!validChannelRef(id)) notFound();
  redirect(channelPath(id));
}
