// Builds the installable web app into dist/: wraps src/kindred.html in a full document and copies public/.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
const root = new URL("../", import.meta.url);
const page = readFileSync(new URL("src/kindred.html", root), "utf8");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Design AI companions with a face, a voice and a memory, then talk to them.">
<meta name="theme-color" content="#d6455d">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style>
</head>
<body>
${page}
</body>
</html>
`;
const dist = new URL("dist/", root);
mkdirSync(dist, { recursive: true });
cpSync(new URL("public/", root), dist, { recursive: true });
writeFileSync(new URL("index.html", dist), html);
console.log("Built dist/ (index.html, manifest, service worker, icons)");
