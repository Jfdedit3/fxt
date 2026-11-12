"use client";

import { cleanShareUrl } from "../../../site-url.mjs";
import { useLanguage } from "../../../Language";
import { useState } from "react";

export default function CopyLinkButton({ url }) {
  const { t } = useLanguage();
  const [label, setLabel] = useState("Copy Fxt link");
  const [error, setError] = useState("");

  async function copyLink() {
    setError("");
    try {
      const target = cleanShareUrl(url);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(target);
      } else {
        const input = document.createElement("textarea");
        input.value = target;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setLabel("Copied!");
      window.setTimeout(() => setLabel("Copy Fxt link"), 1800);
    } catch {
      setError("Copy failed. Copy the URL from your browser address bar.");
      setLabel("Copy Fxt link");
    }
  }

  return (
    <span className="copyControl">
      <button type="button" className="copyHint" onClick={copyLink}>{t(label)}</button>
      {error && <span className="copyError" role="status">{t(error)}</span>}
    </span>
  );
}
