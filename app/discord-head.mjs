import { headers } from "next/headers";
import { buildDiscordComponent, componentOrigin, hasMultipleMedia } from "./discord-component.mjs";

export async function discordMetadata(post, fallbackOrigin) {
  if (!hasMultipleMedia(post)) return {};
  const origin = componentOrigin(await headers(), fallbackOrigin);
  if (!buildDiscordComponent(post, origin)) return {};
  // Next's "other" link descriptors support arbitrary rel values and are
  // rendered in <head>; Discord must discover this without executing JS.
  return { icons: { other: [{ rel: "discord:component-embed", type: "application/json", url: `${origin}/${post.author.screen_name}/status/${post.id}/discord.json` }] } };
}
