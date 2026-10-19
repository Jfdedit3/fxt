/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@ffmpeg-installer/linux-x64"],
  outputFileTracingIncludes: {
    "/api/gif": ["./node_modules/@ffmpeg-installer/linux-x64/ffmpeg"]
  }
};

export default config;
