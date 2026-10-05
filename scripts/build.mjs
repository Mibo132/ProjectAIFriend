// Wraps the page fragment in src/kindred.html into a standalone index.html you can open locally.
import { readFileSync, writeFileSync } from "node:fs";
const page = readFileSync(new URL("../src/kindred.html", import.meta.url), "utf8");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style>
</head>
<body>
${page}
</body>
</html>
`;
writeFileSync(new URL("../index.html", import.meta.url), html);
console.log("Built index.html");
