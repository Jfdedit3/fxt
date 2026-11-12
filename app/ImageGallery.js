"use client";
import { useRef, useState } from "react";
import { useLanguage } from "./Language";
export default function ImageGallery({ images }) {
  const dialog = useRef(null), viewport = useRef(null), pointers = useRef(new Map()), gesture = useRef(null);
  const [index, setIndex] = useState(0), [zoom, setZoom] = useState(1), [message, setMessage] = useState(""); const { t } = useLanguage();
  if (!images.length) return null;
  const current = images[index];
  const reset = () => { setZoom(1); pointers.current.clear(); gesture.current = null; };
  function open(value) { setIndex(value); reset(); dialog.current.showModal(); }
  function move(delta) { setIndex(value => (value + delta + images.length) % images.length); reset(); }
  function changeZoom(value) { setZoom(Math.min(4, Math.max(1, value))); }
  function down(event) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 1) gesture.current = { x: event.clientX, y: event.clientY, zoom, multi: false };
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current = { multi: true, distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }; }
  }
  function drag(event) {
    const previous = pointers.current.get(event.pointerId); if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; if (gesture.current?.distance) changeZoom(gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.distance); }
    else if (zoom > 1) { viewport.current.scrollLeft -= event.clientX - previous.x; viewport.current.scrollTop -= event.clientY - previous.y; }
  }
  function up(event) {
    const initial = gesture.current; pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0 && initial && !initial.multi && initial.zoom === 1 && images.length > 1) { const dx = event.clientX - initial.x, dy = event.clientY - initial.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1); }
  }
  async function fullscreen() {
    setMessage("");
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (dialog.current.requestFullscreen) await dialog.current.requestFullscreen(); else setMessage(t("Fullscreen is unavailable on this device.")); }
    catch { setMessage(t("Fullscreen is unavailable on this device.")); }
  }
  return <div className="imageGallery">{images.map((image, i) => <div className="galleryItem" key={image.url}><button type="button" className="galleryThumbnail" onClick={() => open(i)} aria-label={`${t("Open image")} ${i + 1}`}><img className="postMedia" src={image.url} alt={image.alt || `${i + 1}`} loading="lazy" /></button><a className="mediaDownload" href={`/api/image?url=${encodeURIComponent(image.url)}`}>{t("Download image")} ↓</a></div>)}<dialog ref={dialog} className="galleryDialog" aria-label={t("Image gallery")} onClose={() => { reset(); if (document.fullscreenElement === dialog.current) document.exitFullscreen().catch(() => {}); }} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }} onKeyDown={event => { if (event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }}><div className="galleryToolbar"><span>{index + 1} / {images.length}</span><div className="galleryZoom"><button type="button" onClick={() => changeZoom(zoom - 0.5)} disabled={zoom <= 1} aria-label={t("Zoom out")}>−</button><button type="button" onClick={() => setZoom(1)} aria-label={t("Reset zoom")}>{Math.round(zoom * 100)}%</button><button type="button" onClick={() => changeZoom(zoom + 0.5)} disabled={zoom >= 4} aria-label={t("Zoom in")}>+</button><button type="button" onClick={fullscreen}>{t("Fullscreen")}</button><button type="button" onClick={() => dialog.current.close()} aria-label={t("Close gallery")}>✕</button></div></div><div ref={viewport} className="galleryViewport" onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={() => { pointers.current.clear(); gesture.current = null; }} onDoubleClick={() => changeZoom(zoom === 1 ? 2 : 1)}><img className="galleryFullImage" style={{ width: `${zoom * 100}%`, maxHeight: zoom === 1 ? "72dvh" : "none" }} src={current.url} alt={current.alt || `${index + 1}`} draggable={false} /></div>{message && <p role="status">{message}</p>}<div className="galleryControls">{images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label={t("Previous image")}>←</button>}<a href={`/api/image?url=${encodeURIComponent(current.url)}`}>{t("Download image")} ↓</a><a href={current.url} target="_blank" rel="noreferrer">{t("Open original image ↗")}</a>{images.length > 1 && <button type="button" onClick={() => move(1)} aria-label={t("Next image")}>→</button>}</div></dialog></div>;
}
