// End-to-end smoke test in Demo mode against dist/: node scripts/build.mjs && node scripts/smoke-test.mjs [outDir]
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname } from "node:path";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/playwright"); }
const out = process.argv[2] || "test-output"; mkdirSync(out, { recursive: true });
const dist = new URL("../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  const p = dist + (req.url === "/" ? "index.html" : req.url.slice(1).split("?")[0]);
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const browser = await pw.chromium.launch();
const errors = [];
const check = (cond, msg) => { if (!cond) { errors.push(msg); console.log("FAIL", msg); } else console.log("ok  ", msg); };
const idle = page => page.waitForFunction(() => !document.querySelector("#sendBtn.stop"), null, { timeout: 20000 });

const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("pageerror: " + e.message));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.goto(url);

// onboarding
await page.waitForSelector("#ob-start");
check(true, "welcome screen shows on first visit");
await page.fill("#ob-name", "Sam");
await page.click('[data-accent="262"]');
await page.click("#ob-start");
check((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent-h"))).trim() === "262", "accent color applies");
check((await page.locator(".hero h2").innerText()).includes("Sam"), "home greets by name");
check(await page.locator(".grid .card").count() === 5, "4 example companions + create card");
await page.screenshot({ path: `${out}/1-home.png` });

// images: use offline placeholder art
await page.click('.side-foot [data-act="settings"]');
await page.click('[data-stab="images"]');
await page.selectOption("#s-iprov", "demo");
await page.click('[data-s="save"]');

// chat
await page.locator(".card", { hasText: "Mira" }).click();
check(await page.locator(".msg.assistant").count() === 1, "greeting shown");
await page.fill("#input", "Hey Mira! *waves*");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelectorAll(".msg.assistant").length === 2, null, { timeout: 15000 }); await idle(page);
const reply = await page.locator(".msg.assistant .bubble").last().innerText();
check(/Demo mode/.test(reply) && !/<mood>/.test(reply), "reply streamed with mood tag hidden");
check(await page.locator("#topSub .mood").count() === 1, "mood shows in header");
check((await page.locator(".bond-row span").innerText()).startsWith("1 /"), "bond increased");
await page.locator(".msg.last").hover();
await page.click('.msg.last [data-act="regen"]');
await page.waitForFunction(() => document.querySelector(".alt-nav")?.textContent === "2/2", null, { timeout: 15000 }); await idle(page);
check(true, "regenerate creates alternate 2/2");

// photo on request
await page.fill("#input", "Can you send me a selfie?");
await page.keyboard.press("Enter");
await page.waitForSelector(".chat-img[src]", { timeout: 20000 }); await idle(page);
check(true, "companion sends a photo when asked");
check(await page.locator("#panel .gallery img[src]").count() >= 1, "photo saved to gallery");
await page.fill("#memInput", "Loves rainy days"); await page.click("#memForm button");
check(await page.locator(".mem li").count() === 1, "manual memory added");
await page.selectOption("#ambSelect", "rain");
check(await page.locator('[data-act="ambience"].on').count() === 1, "background sound toggles on");
await page.screenshot({ path: `${out}/2-chat.png` });

// image studio
await page.click('.tb-tools [data-act="studio"]');
await page.fill("#i-prompt", "a teen girl at the beach");
await page.click('[data-i="go"]');
await page.waitForFunction(() => document.querySelector("#iErr")?.textContent.length > 0, null, { timeout: 5000 });
check(/minors|adult/i.test(await page.locator("#iErr").innerText()), "image prompt describing a minor is blocked");
await page.fill("#i-prompt", "reading in a sunny window seat");
await page.click('[data-i="go"]');
await page.waitForSelector("#studioCanvas img[src]", { timeout: 10000 });
check(true, "image studio generates an image");
await page.screenshot({ path: `${out}/3-studio.png` });
await page.click('[data-i="avatar"]');
check(await page.waitForFunction(() => document.querySelector(".topbar .av")?.style.backgroundImage.startsWith("url"), null, { timeout: 5000 }).then(() => true, () => false), "studio image set as avatar");
await page.keyboard.press("Escape");

// AI creator (archetype, demo mode)
await page.click('.side [data-act="creator"]');
await page.click('[data-arch="artist"]');
await page.click('[data-c="generate"]');
await page.waitForSelector(".preview-info h3");
await page.click('[data-c="portrait"]');
await page.waitForSelector(".portrait img", { timeout: 10000 });
await page.screenshot({ path: `${out}/4-creator.png` });
const newName = await page.locator(".preview-info h3").innerText();
await page.click('[data-c="create"]');
check(await page.waitForFunction(n => document.querySelector(".topbar h2")?.textContent === n, newName, { timeout: 5000 }).then(() => true, () => false), "AI creator makes a companion and opens the chat");
check(await page.locator("#panel .gallery img").count() >= 1, "creator portrait lands in the gallery");

// editor: age gate, voice tab
await page.click('.side [data-act="new"]');
await page.fill("#f-name", "Test Person");
await page.fill("#f-age", "16");
await page.click('[data-e="save"]');
check((await page.locator("#edErr").innerText()).includes("18"), "under-18 companion rejected");
await page.fill("#f-age", "29");
await page.click('[data-tab="voice"]');
check(await page.locator("#f-amb").count() === 1, "voice & sound tab renders");
await page.click('[data-tab="chat"]');
check(await page.locator("#f-mature").isDisabled(), "18+ switch locked until settings allow");
await page.screenshot({ path: `${out}/5-editor.png` });
await page.click('[data-e="save"]');
check((await page.locator(".topbar h2").innerText()) === "Test Person", "new companion created");

// settings: 18+ gate
await page.click('.side-foot [data-act="settings"]');
await page.click('[data-stab="mature"]');
check(await page.locator("#s-mature").isDisabled(), "18+ disabled before age confirmation");
await page.check("#s-age"); await page.check("#s-mature");
await page.click('[data-s="save"]');
await page.click('#panel [data-act="edit"]'); await page.click('[data-tab="chat"]');
check(!(await page.locator("#f-mature").isDisabled()), "18+ switch unlocked after opting in");
await page.keyboard.press("Escape");

// persistence incl. images
await page.locator(".item", { hasText: "Mira" }).click();
await page.reload();
await page.waitForSelector(".chat-img[src]", { timeout: 10000 });
check((await page.locator(".topbar h2").innerText()) === "Mira Okafor", "state and images persist after reload");

// installable app
check(await page.evaluate(() => !!document.querySelector('link[rel="manifest"]')), "manifest linked");
check(await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 5000))])), "service worker registers");

// mobile + dark
const m = await browser.newPage({ viewport: { width: 390, height: 800 }, colorScheme: "dark" });
m.on("pageerror", e => errors.push("mobile pageerror: " + e.message));
await m.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await m.goto(url);
await m.click("#ob-start");
await m.screenshot({ path: `${out}/6-mobile-list.png` });
await m.locator(".item", { hasText: "Juno" }).click();
check(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll on phone");
await m.screenshot({ path: `${out}/7-mobile-chat-dark.png` });
await m.click('[data-act="creator"] >> nth=0').catch(() => {});

await browser.close(); server.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n` + errors.join("\n") : "\nAll checks passed.");
process.exit(errors.length ? 1 : 0);
