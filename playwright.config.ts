import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import process from "node:process";
const chromiumPath = process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath: chromiumPath,
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
