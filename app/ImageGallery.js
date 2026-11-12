"use client";
import { useRef, useState } from "react";
import { useLanguage } from "./Language";
export default function ImageGallery({ images }) {
  const dialog = useRef(null); const [index, setIndex] = useState(0); const { t } = useLanguage();
  if (!images.length) return null;
  const current = images[index];
  function open(value) { setIndex(value); dialog.current.showModal(); }
  const move = delta => setIndex(value => (value + delta + images.length) % images.length);
  return <div className="imageGallery">{images.map((image, i) => <div className="galleryItem" key={image.url}><button type="button" className="galleryThumbnail" onClick={() => open(i)} aria-label={`${t("Open image")} ${i + 1}`}><img className="postMedia" src={image.url} alt={image.alt || `${i + 1}`} loading="lazy" /></button><a className="mediaDownload" href={`/api/image?url=${encodeURIComponent(image.url)}`}>{t("Download image")} ↓</a></div>)}<dialog ref={dialog} className="galleryDialog" aria-label={t("Image gallery")} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }} onKeyDown={event => { if (event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }}><div className="galleryToolbar"><span>{index + 1} / {images.length}</span><button type="button" onClick={() => dialog.current.close()} aria-label={t("Close gallery")}>✕</button></div><img className="galleryFullImage" src={current.url} alt={current.alt || `${index + 1}`} /><div className="galleryControls">{images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label={t("Previous image")}>←</button>}<a href={`/api/image?url=${encodeURIComponent(current.url)}`}>{t("Download image")} ↓</a><a href={current.url} target="_blank" rel="noreferrer">{t("Open original image ↗")}</a>{images.length > 1 && <button type="button" onClick={() => move(1)} aria-label={t("Next image")}>→</button>}</div></dialog></div>;
}
