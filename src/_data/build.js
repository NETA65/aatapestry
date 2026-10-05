// Facts about this build (shown in the footer, the sitemap and the feed).
import { execSync } from "node:child_process";

let sha = "";
try {
  sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  sha = "";
}

const now = new Date();
export default {
  time: now.toISOString(),
  date: now.toISOString().slice(0, 10),
  year: now.getFullYear(),
  sha,
  production: process.env.ELEVENTY_RUN_MODE === "build" || !!process.env.CI,
  ci: !!process.env.GITHUB_ACTIONS,
  repoUrl: process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : "",
};
