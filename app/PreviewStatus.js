import { T } from "./Language";
export default function PreviewStatus({ stale = false }) {
  return <details className="previewStatus"><summary><T>Preview status</T></summary><p><T>{stale ? "Last available data" : "Preview ready"}</T></p><p><T>Discord controls the final preview and its cache.</T></p><a href="https://discord.com/developers/embeds" target="_blank" rel="noreferrer"><T>Check in Discord ↗</T></a></details>;
}
