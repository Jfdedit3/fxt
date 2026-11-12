import { redirect, notFound } from "next/navigation";
import { validInviteCode } from "../../discord-url.mjs";
export default async function Alias({ params }) { const { id } = await params; if (!validInviteCode(id)) notFound(); redirect(`/discord/invite/${id}`); }
