# Fxt — X/Twitter link preview alternative

A Vercel-ready Next.js app that converts public X/Twitter status links into pages with server-rendered Open Graph and Twitter Card metadata.

## Deploy to Vercel

1. Import `Jfdedit3/fxt` into Vercel.
2. Use the **Next.js** framework preset.
3. Recommended: set `NEXT_PUBLIC_SITE_URL` to the canonical public URL of the deployment, for example `https://your-project.vercel.app` (no trailing path).
4. Deploy.

If `NEXT_PUBLIC_SITE_URL` is omitted, the app uses Vercel's `VERCEL_URL` value when available. Local development falls back to `http://localhost:3000`. Set the variable on production to ensure canonical and share URLs always use your intended custom domain.

## How to use

Paste a public post or profile URL on the homepage, or open either directly on your Fxt domain:

```text
https://x.com/username
https://your-project.vercel.app/username
https://x.com/username/status/123456789
https://your-project.vercel.app/username/status/123456789
```

The post page includes a working **Copy Fxt link** button. Post identifiers and usernames are validated before upstream requests; upstream API attempts time out after 4.5 seconds, and Next.js may cache responses for 60 seconds.

## Important upstream dependency

This project currently retrieves post data from the public `api.fxtwitter.com` endpoint. It is a separate front end and metadata renderer, but **it is not an independent data provider**. Availability, rate limits, API response formats, and media access depend on that upstream service. A true independent provider would require a supported data source or separately maintained compatible backend.

The video proxy only accepts HTTPS MP4/WebM URLs hosted on `video.twimg.com`, rejects redirects and nonstandard ports, and enforces upstream connection and idle-read timeouts. It forwards HTTP Range requests so browsers can buffer and seek within the stream. It does not download or permanently store video files. The app does not intentionally maintain a public feed or database of requested posts. It does not bypass private or restricted posts. Do not treat this initial implementation as production-hardened against abuse; add platform-level rate limiting and monitoring before operating it at scale.

## Features

- Responsive dark interface.
- Validation for X/Twitter status URLs and route parameters.
- Server-rendered Open Graph and Twitter Card metadata.
- Post text, author, avatar, images, and video when supplied by the upstream API.
- Photo mosaics in share previews for multi-image posts.
- Likes, reposts, replies, quotes, bookmarks, and views when provided (missing counts stay hidden).
- Expandable author biography, follower counts, location, website, and verification indicator.
- Clickable author avatars and names open a public profile on Fxt (`/username`), with a banner, biography, join date, account counts, and paginated Posts, Posts & replies, and Media feeds.
- Reply context, quoted posts, poll results, link cards, community notes, and post language when supplied by the API.
- Engagement counts in Open Graph and Twitter Card descriptions. Counts may be cached for 60 seconds; poll voting remains on X.
- GIF downloads convert X’s MP4 animation into a real looping `.gif` file using FFmpeg (15 fps, up to 640 pixels wide), with an `image/gif` content type and `.gif` filename. Inputs are limited to 20 MiB, outputs to 25 MiB, and conversion to 25 seconds.
- Explicit MP4 downloads with an attachment filename and full-file response, separate from playback byte ranges. Ordinary videos keep their original encoding.
- Byte-range streaming proxy for X-hosted MP4 videos, to improve buffering and seeking.
- Copyable Fxt share URL.
- Graceful handling of unavailable or private posts.
- Bounded upstream request timeouts and short response caching.

X and Twitter are trademarks of their respective owners. This project is not affiliated with X Corp.

Run the regression checks with `node --test tests/*.test.mjs`. Profile and feed data use the FxTwitter v2 profile endpoints with 4.5-second timeouts per attempt and 60-second caching. Protected account posts remain unavailable; failures and empty feeds are shown separately.

GIF conversion runs in the Node.js function and uses `ffmpeg-static`. The Next.js configuration includes its static executable in the Vercel `/api/gif` function. Temporary source files are removed after conversion or an error. Converted GIFs are cached by canonical source URL for one hour with a 128 MiB per-instance disk budget. Concurrent requests for the same GIF share one conversion.

## Reliability and resource limits

Profile lookups try the v2 profile endpoint, the stable numeric ID when provided by an author link, the legacy profile endpoint, then the account author in its public timeline. A single upstream 404 does not produce a missing-profile page. Timeline requests can fall back to the numeric user ID. API responses are validated before rendering; transient failures are retried once. Confirmed missing profiles/posts return 404; temporary failures redirect to a friendly non-indexable 503 page with a retry link.

Media limits apply **per running function instance**: 6 GIF requests/minute/client, 120 video requests/minute/client, 2 simultaneous GIF conversions and 16 upstream video streams. They are bounded in-memory protections, not a distributed account-wide quota. A shared rate-limit store or hosting firewall is needed for a strict budget across multiple instances. Conversions have a 25-second deadline; connections and video reads have timeouts; client cancellation stops video streaming.

## Checks

Use Node.js 24 and `npm ci`, then run `npm run lint`, `npm test`, and `npm run build`. Browser tests run with `npx playwright install chromium` followed by `npm run test:e2e`. They start the production server with deterministic upstream fixtures, including HoldingNuts_3D's intermittent profile 404 case, pagination, anonymous status URLs, legacy GIFs and real HTTP error statuses. They do not depend on public X data or network availability. GitHub Actions runs these checks and the production dependency audit on pushes and pull requests.
