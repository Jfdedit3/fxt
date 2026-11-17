"use client";
import { useState } from "react";
import ImageGallery from "./ImageGallery";
import { useLanguage } from "./Language";
export default function PostGallery({ images, panels }) {
  const [mode, setMode] = useState("images"); const { t } = useLanguage();
  return <>{panels.length > 0 && <div className="galleryModes" role="group" aria-label={t("Gallery mode")}><button type="button" aria-pressed={mode === "images"} onClick={() => setMode("images")}>{t("Individual images")}</button><button type="button" aria-pressed={mode === "panels"} onClick={() => setMode("panels")}>{t("Panels (4 images)")}</button></div>}<ImageGallery key={mode} images={mode === "panels" ? panels : images} downloadImages={images} /></>;
}
