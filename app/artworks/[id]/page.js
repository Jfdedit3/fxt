import { redirect, notFound } from "next/navigation";
import { validPixivId } from "../../pixiv-url.mjs";
export default async function Alias({ params }) { const { id } = await params; if (!validPixivId(id)) notFound(); redirect(`/pixiv/artworks/${id}`); }
