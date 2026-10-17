import "./globals.css";

export const metadata = {
  title: "Fxt — X links, better previews",
  description: "A fast, privacy-minded alternative for sharing X/Twitter posts with rich previews.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fxt.vercel.app"),
  openGraph: { type: "website", siteName: "Fxt", title: "Fxt — X links, better previews", description: "Share X posts with rich previews." },
  twitter: { card: "summary_large_image", title: "Fxt — X links, better previews", description: "Share X posts with rich previews." }
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
