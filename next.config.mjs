/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/gif": ["./node_modules/ffmpeg-static/ffmpeg"]
  }
};

export default config;
