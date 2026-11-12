import "./globals.css";
import { cookies } from "next/headers";
import Language from "./Language";

function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch { /* Fall back to the default URL. */ }
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

export const metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: "Fxt — X & YouTube, better previews",
  description: "A fast, privacy-minded alternative for sharing X/Twitter and YouTube posts with rich previews.",
  openGraph: {
    type: "website",
    siteName: "Fxt",
    title: "Fxt — X & YouTube, better previews",
    description: "Share X posts with rich previews."
  },
  twitter: {
    card: "summary_large_image",
    title: "Fxt — X & YouTube, better previews",
    description: "Share X posts with rich previews."
  }
};

export default async function RootLayout({ children }) {
  const language = (await cookies()).get("fxt_language")?.value === "fr" ? "fr" : "en";
  return <html lang={language}><body><Language initialLanguage={language}>{children}</Language></body></html>;
}
