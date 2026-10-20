import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", testMatch: "**/*.spec.js", timeout: 30000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", viewport: { width: 390, height: 844 }, browserName: "chromium", ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] } } : {}) },
  webServer: {
    command: "node --require ./tests/e2e/upstream-fixture.cjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    env: { FXT_E2E: "1" },
    url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 30000
  }
});
