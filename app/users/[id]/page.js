import { redirect, notFound } from "next/navigation";
import { validDiscordId } from "../../discord-url.mjs";
export default async function Alias({ params }) { const { id } = await params; if (!validDiscordId(id)) notFound(); redirect(`/discord/users/${id}`); }
