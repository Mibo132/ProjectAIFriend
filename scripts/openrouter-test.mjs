// Tests the OpenRouter integration against a simulated openrouter.ai: node scripts/build.mjs && node scripts/openrouter-test.mjs
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname } from "node:path";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(require("node:child_process").execSync("npm root -g").toString().trim() + "/playwright"); }
const dist = new URL("../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer((req, res) => {
  const p = dist + (req.url.split("?")[0] === "/" ? "index.html" : req.url.slice(1).split("?")[0]);
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const errors = [], seen = {};
const check = (cond, msg) => { if (!cond) { errors.push(msg); console.log("FAIL", msg); } else console.log("ok  ", msg); };

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: "block" });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await ctx.route("https://openrouter.ai/**", async route => {
  const req = route.request(), u = new URL(req.url());
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...cors, "access-control-allow-methods": "*" } });
  if (u.pathname === "/auth") {
    seen.auth = Object.fromEntries(u.searchParams);
    return route.fulfill({ status: 302, headers: { location: u.searchParams.get("callback_url") + "?code=test-code" } });
  }
  if (u.pathname === "/api/v1/auth/keys") { seen.exchange = JSON.parse(req.postData()); return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ key: "sk-or-test" }) }); }
  if (u.pathname === "/api/v1/models") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ data: [
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta: Llama 3.3 70B Instruct", context_length: 131072, pricing: { prompt: "0.00000012", completion: "0.0000003" }, architecture: { output_modalities: ["text"] } },
    { id: "mistralai/mistral-nemo:free", name: "Mistral: Nemo (free)", context_length: 32000, pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["text"] } },
    { id: "some/image-model", name: "Image model", context_length: 0, pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["image"] } },
  ] }) });
  if (u.pathname === "/api/v1/chat/completions") {
    seen.chat = { headers: req.headers(), body: JSON.parse(req.postData()) };
    const chunks = ["*smiles* ", "Hello from ", "OpenRouter.", "\n<mood>flirty</mood>"].map(t => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`).join("") + "data: [DONE]\n\n";
    return route.fulfill({ status: 200, headers: cors, contentType: "text/event-stream", body: chunks });
  }
  return route.fulfill({ status: 404, headers: cors, body: "{}" });
});
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("pageerror: " + e.message));
await page.goto(url);
await page.check("#ob-age"); await page.click("#ob-start");

await page.click('.side-foot [data-act="settings"]');
await page.click('[data-stab="ai"]');
await page.selectOption("#s-prov", "openrouter");
check(await page.locator('[data-s="or-connect"]').count() === 1, "Connect OpenRouter button shows");
await page.click('[data-s="or-connect"]');
await page.waitForSelector("#s-ork", { timeout: 10000 });
check(seen.auth?.code_challenge_method === "S256" && seen.auth?.code_challenge?.length > 40, "sign-in uses PKCE (S256)");
check(seen.exchange?.code === "test-code" && seen.exchange?.code_verifier?.length > 40, "code exchanged with the verifier");
check(await page.inputValue("#s-ork") === "sk-or-test", "key saved after sign-in");
check(!page.url().includes("code="), "code removed from the address bar");
await page.click('[data-s="or-load"]');
await page.waitForSelector("[data-ormodel]");
check(await page.locator("[data-ormodel]").count() === 2, "model list loads (image-only models filtered out)");
await page.fill("#s-orq", "free");
check(await page.locator("[data-ormodel]").count() === 1, "model search filters");
await page.click('[data-ormodel="mistralai/mistral-nemo:free"]');
check(await page.inputValue("#s-orm") === "mistralai/mistral-nemo:free", "picking a model fills the field");
await page.screenshot({ path: "/tmp/claude-0/-home-user-ProjectAIFriend/ae924819-9ca4-5a42-8867-d1c1f9f5b38e/scratchpad/or-settings.png" });
await page.click('[data-s="save"]');
check((await page.locator(".side-foot .provider-pill").innerText()).includes("OpenRouter"), "OpenRouter is the active provider");

await page.locator(".item", { hasText: "Mira" }).click();
await page.fill("#input", "hi you");
await page.keyboard.press("Enter");
await page.waitForFunction(() => /Hello from OpenRouter/.test(document.querySelector(".msg.assistant:last-of-type .bubble")?.textContent || ""), null, { timeout: 10000 });
check(true, "reply streams from OpenRouter");
check(seen.chat.headers.authorization === "Bearer sk-or-test" && seen.chat.headers["x-title"] === "Kindred", "request carries key and app name");
check(seen.chat.body.model === "mistralai/mistral-nemo:free" && seen.chat.body.stream === true, "request uses the chosen model, streaming");
const sys = seen.chat.body.messages[0];
check(sys.role === "system" && /uncensored roleplay between consenting adults/.test(sys.content) && /under 18/.test(sys.content), "explicit 18+ rules and minor ban in the system prompt");
check((await page.locator("#topSub .mood").innerText()).includes("flirty"), "mood parsed from the reply");

await browser.close(); server.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n` + errors.join("\n") : "\nAll OpenRouter checks passed.");
process.exit(errors.length ? 1 : 0);
