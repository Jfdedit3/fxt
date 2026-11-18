"use client";
import { useEffect, useState } from "react";

const MAX_RETRIES = 3;
const DELAYS = [1500, 4000, 9000];

export default function RetryImage({ src, alt = "", className, ...props }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    setPending(false);
  }, [src]);

  useEffect(() => {
    if (!failed || attempt >= MAX_RETRIES) return;
    const timer = setTimeout(() => {
      setAttempt(value => value + 1);
      setFailed(false);
      setPending(false);
    }, DELAYS[attempt]);
    return () => clearTimeout(timer);
  }, [failed, attempt]);

  const retry = () => {
    setAttempt(value => value + 1);
    setFailed(false);
    setPending(false);
  };
  const url = (() => {
    if (!src || attempt === 0) return src;
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}_retry=${attempt}`;
  })();

  return <span className="retryImageWrap">
    {!pending && <img {...props} className={className} src={url} alt={alt} onError={() => { setFailed(true); setPending(true); }} onLoad={() => { setFailed(false); setPending(false); }} />}
    {pending && <span className="retryImageFallback" role="status">
      <span>{attempt < MAX_RETRIES ? "Image temporarily unavailable — retrying…" : "Image unavailable"}</span>
      <button type="button" onClick={retry}>Retry image</button>
    </span>}
  </span>;
}
