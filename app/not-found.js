import Link from "next/link";

export default function NotFound() {
  return <main className="postShell"><section className="postCard" style={{ marginTop: 50 }}><h1>Profile or post not found</h1><p>The requested public profile or post could not be found.</p><Link className="primaryLink" href="/">Back to Fxt</Link></section></main>;
}
