// One-off: renders public/icon.svg to the PNG sizes the manifest lists. Needs Playwright.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/playwright"); }
const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
const browser = await pw.chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({ path: new URL(`../public/icon-${size}.png`, import.meta.url).pathname, omitBackground: true });
}
await browser.close();
console.log("Wrote public/icon-192.png and public/icon-512.png");
