# Fxt — X/Twitter link preview alternative

A Vercel-ready Next.js app that converts X/Twitter status links into pages with server-rendered Open Graph and Twitter Card metadata.

## Deploy to Vercel

1. Import `Jfdedit3/fxt` into Vercel.
2. Set the framework preset to **Next.js**.
3. Optional environment variable: `NEXT_PUBLIC_SITE_URL` to your public deployment URL (for example, `https://your-project.vercel.app`).
4. Deploy.

## How to use

Paste a public post URL on the homepage, or replace the original URL prefix with your deployment domain:

```text
https://x.com/username/status/123456789
https://your-project.vercel.app/username/status/123456789
```

## Important upstream dependency

This initial implementation retrieves post data from the public `api.fxtwitter.com` endpoint. It is a separate Vercel-hosted front end and metadata renderer, but it is **not yet an independent data provider**: availability, rate limits, and media access depend on that upstream service. To remove that dependency, integrate a supported X data provider or a separately maintained compatible backend.

The app does not intentionally maintain a public feed or database of requested posts. Responses may be cached by Next.js for up to 60 seconds.

## Features

- Responsive dark interface.
- URL validation for X/Twitter status links.
- Server-rendered Open Graph and Twitter Card metadata.
- Post text, author, images, and video where provided by the upstream API.
- Graceful handling of unavailable or private posts.

X and Twitter are trademarks of their respective owners. This project is not affiliated with X Corp.
