/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["ffmpeg-static", "sharp"],
  outputFileTracingIncludes: {
    "/api/gif": ["./node_modules/ffmpeg-static/ffmpeg"]
  }
};

export default config;
