// End-to-end smoke test in Demo mode: node scripts/smoke-test.mjs [outDir]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/playwright"); }
const out = process.argv[2] || "test-output"; mkdirSync(out, { recursive: true });
const url = pathToFileURL(new URL("../index.html", import.meta.url).pathname).href;
const browser = await pw.chromium.launch();
const errors = [];
const check = (cond, msg) => { if (!cond) { errors.push(msg); console.log("FAIL", msg); } else console.log("ok  ", msg); };

const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
page.on("pageerror", e => errors.push("pageerror: " + e.message));
await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await page.goto(url);
check(await page.locator(".card").count() === 5, "home shows 4 example companions + new card");
await page.screenshot({ path: `${out}/1-home.png` });

await page.locator(".card", { hasText: "Mira" }).click();
check(await page.locator(".msg.assistant").count() === 1, "greeting shown");
await page.fill("#input", "Hey Mira! *waves*");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelectorAll(".msg.assistant").length === 2 && !document.querySelector("#sendBtn.stop"), null, { timeout: 15000 });
check(/Demo mode/.test(await page.locator(".msg.assistant").last().innerText()), "demo reply streamed");
check((await page.locator(".bond-row span").innerText()).startsWith("1 /"), "bond increased");
await page.locator(".msg.last").hover();
await page.click('[data-act="regen"]');
await page.waitForFunction(() => document.querySelector(".alt-nav")?.textContent === "2/2" && !document.querySelector("#sendBtn.stop"), null, { timeout: 15000 });
check(true, "regenerate creates alternate 2/2");
await page.fill("#memInput", "Loves rainy days"); await page.click("#memForm button");
check(await page.locator(".mem li").count() === 1, "manual memory added");
await page.screenshot({ path: `${out}/2-chat.png` });

// editor: age gate + create
await page.click('.side [data-act="new"]');
await page.fill("#f-name", "Test Person");
await page.fill("#f-age", "16");
await page.click('[data-e="save"]');
check((await page.locator("#edErr").innerText()).includes("18"), "under-18 rejected");
await page.fill("#f-age", "29");
await page.click('[data-tab="personality"]');
await page.click('[data-multi="traits"] button[data-v="Witty"]');
await page.click('[data-tab="chat"]');
check(await page.locator("#f-mature").isDisabled(), "mature switch locked until settings allow");
await page.fill("#f-gr", "Hi there.");
await page.screenshot({ path: `${out}/3-editor.png` });
await page.click('[data-e="save"]');
check((await page.locator(".topbar h2").innerText()) === "Test Person", "new companion created and opened");

// settings: mature gate
await page.click('.side-foot [data-act="settings"]');
check(await page.locator("#s-mature").isDisabled(), "mature disabled before age confirm");
await page.check("#s-age"); await page.check("#s-mature");
await page.screenshot({ path: `${out}/4-settings.png` });
await page.click('[data-s="save"]');
await page.click('[data-act="edit"] >> nth=0'); await page.click('[data-tab="chat"]');
check(!(await page.locator("#f-mature").isDisabled()), "mature switch unlocked after opt-in");
await page.keyboard.press("Escape");

// persistence
await page.reload();
check((await page.locator(".topbar h2").innerText()) === "Test Person", "state persists after reload");

// mobile
const m = await browser.newPage({ viewport: { width: 390, height: 800 } });
m.on("pageerror", e => errors.push("mobile pageerror: " + e.message));
await m.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await m.goto(url);
await m.screenshot({ path: `${out}/5-mobile-list.png` });
await m.locator(".item", { hasText: "Juno" }).click();
check(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll on phone");
await m.emulateMedia({ colorScheme: "dark" });
await m.screenshot({ path: `${out}/6-mobile-chat-dark.png` });

await browser.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n` + errors.join("\n") : "\nAll checks passed.");
process.exit(errors.length ? 1 : 0);
