import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const templatePath = path.join(appRoot, "public/catalog-template.pptx");
const buf = fs.readFileSync(templatePath);
const zip = await JSZip.loadAsync(buf);

const slide2 = await zip.file("ppt/slides/slide2.xml").async("string");
const pres = await zip.file("ppt/presentation.xml").async("string");
const slideIds = [...pres.matchAll(/<p:sldId/g)].length;
const slidesInZip = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));

console.log("slides in zip:", slidesInZip.length, slidesInZip);
console.log("sldId count in presentation:", slideIds);

const placeholders = ["{{mark}}", "{{productTitle}}", "{{projectName}}"];
for (const p of placeholders) {
  console.log(p, slide2.includes(p) ? "unfilled" : "filled or missing");
}

// Check split placeholders
const broken = slide2.match(/\{\{[^}]{0,20}$/m) || [];
console.log("split open braces in runs:", broken.length);

// Sample: find {{ that isn't complete in single a:t
let splitCount = 0;
for (const m of slide2.matchAll(/<a:t>([^<]*)<\/a:t>/g)) {
  const t = m[1];
  if (t.includes("{{") && !t.match(/\{\{[a-zA-Z0-9_]+\}\}/)) splitCount++;
  if (t.includes("}}") && !t.includes("{{")) splitCount++;
}
console.log("suspicious runs:", splitCount);
