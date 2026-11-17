"use client";
import { useId, useRef, useState } from "react";
import { useLanguage } from "./Language";

const archiveLimit = 128 * 1024 * 1024;
const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif" };

export function imageDownloadHref(image) {
  return image.downloadUrl || `/api/image?url=${encodeURIComponent(image.url)}`;
}

function archiveFilename(username) {
  const name = username?.trim().replace(/[^\p{L}\p{M}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `fxt-${name || "images"}.zip`;
}

function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function ImageDownloadMenu({ images, username }) {
  const { t } = useLanguage();
  const dialog = useRef(null);
  const active = useRef(null);
  const title = useId();
  const [selected, setSelected] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  function open() {
    setSelected(images.length === 1 ? [0] : []);
    setError("");
    dialog.current.showModal();
  }

  function cancel() {
    active.current?.abort();
    active.current = null;
    setProgress(null);
  }

  function selectAll() {
    setSelected(images.map((_, index) => index));
    setError("");
  }

  function invertSelection() {
    setSelected(value => images.map((_, index) => index).filter(index => !value.includes(index)));
    setError("");
  }

  async function download(event) {
    event.preventDefault();
    if (!selected.length || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    const files = {};
    let bytes = 0;
    setProgress(0);
    setError("");

    try {
      for (const [position, index] of [...selected].sort((a, b) => a - b).entries()) {
        const response = await fetch(imageDownloadHref(images[index]), { signal });
        const extension = extensions[response.headers.get("content-type")?.split(";")[0]];
        if (!response.ok || !extension) {
          await response.body?.cancel();
          throw new Error(response.status === 429 ? "Too many downloads. Try again shortly." : "An image could not be downloaded.");
        }
        const blob = await response.blob();
        const filename = `fxt-image-${index + 1}.${extension}`;
        if (selected.length === 1) {
          saveFile(blob, filename);
          break;
        }
        bytes += blob.size;
        if (bytes > archiveLimit) throw new Error("The ZIP is too large. Select fewer images.");
        files[filename] = new Uint8Array(await blob.arrayBuffer());
        signal.throwIfAborted();
        setProgress(position + 1);
      }
      if (selected.length > 1) {
        const { zipSync } = await import("fflate");
        signal.throwIfAborted();
        saveFile(new Blob([zipSync(files, { level: 0 })], { type: "application/zip" }), archiveFilename(username));
      }
      dialog.current.close();
    } catch (failure) {
      if (!signal.aborted) {
        const messages = ["Too many downloads. Try again shortly.", "The ZIP is too large. Select fewer images."];
        setError(messages.includes(failure.message) ? failure.message : "An image could not be downloaded.");
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setProgress(null);
      }
    }
  }

  const busy = progress !== null;
  return <>
    <button className="mediaDownload imageDownloadButton" type="button" onClick={open}>{t("Download")} ↓</button>
    <dialog className="galleryDialog imageDownloadDialog" ref={dialog} aria-labelledby={title} onCancel={cancel} onClose={cancel}>
      <form onSubmit={download}>
        <div className="galleryToolbar">
          <h2 id={title}>{t("Download images")}</h2>
          <button type="button" onClick={() => { cancel(); dialog.current.close(); }} aria-label={t("Close download menu")}>✕</button>
        </div>
        <div className="imageDownloadSelection" role="group" aria-label={t("Select images")}>
          <button className="mediaDownload" type="button" disabled={busy || selected.length === images.length} onClick={selectAll}>{t("Select all")}</button>
          <button className="mediaDownload" type="button" disabled={busy} onClick={invertSelection}>{t("Invert selection")}</button>
        </div>
        <fieldset className="imageDownloadChoices" disabled={busy} aria-label={t("Select images")}>
          {images.map((image, index) => <label key={image.url} className="imageDownloadChoice">
            <img src={image.url} alt="" loading="lazy" />
            <span><input type="checkbox" checked={selected.includes(index)} onChange={event => {
              const checked = event.target.checked;
              setSelected(value => checked ? [...value, index] : value.filter(item => item !== index));
              setError("");
            }} /> {t("Image")} {index + 1}</span>
          </label>)}
        </fieldset>
        {error && <p className="error" role="alert">{t(error)}</p>}
        <div className="galleryControls">
          <span role="status">{busy ? `${t("Preparing download…")} ${progress}/${selected.length}` : `${selected.length}/${images.length} ${t("selected")}`}</span>
          <button type="submit" disabled={busy || !selected.length}>{t(selected.length > 1 ? "Download ZIP" : "Download selected")}</button>
        </div>
      </form>
    </dialog>
  </>;
}
