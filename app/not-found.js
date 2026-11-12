import { T } from "./Language";
import Link from "next/link";

export default function NotFound() {
  return <main className="postShell"><section className="postCard" style={{ marginTop: 50 }}><h1><T>Page not found</T></h1><p><T>This profile or post may not exist, or it may be unavailable from the source.</T></p><Link className="primaryLink" href="/"><T>Back to Fxt</T></Link></section></main>;
}
