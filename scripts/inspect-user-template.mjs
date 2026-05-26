import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const userPath = process.argv[2] || "c:/Users/nimos/Desktop/catalog-template (1).pptx";

const buf = fs.readFileSync(userPath);
const zip = await JSZip.loadAsync(buf);
const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
console.log("file:", userPath);
console.log("slides:", slides.sort());

const slide2 = await zip.file("ppt/slides/slide2.xml")?.async("string");
if (!slide2) {
  console.log("ERROR: no slide2");
  process.exit(1);
}

const checks = [
  "{{mark}}",
  "{{productTitle}}",
  "{{productUrl}}",
  "{{mountingInstructionsLabel}}",
  "{{mountingInstructionsUrl}}",
  "{{reflector}}",
  'name="TextBox 13"',
];
for (const c of checks) {
  console.log(c, slide2.includes(c) ? "ok" : "MISSING");
}

console.log("size MB:", (buf.length / 1024 / 1024).toFixed(2));
