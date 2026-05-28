import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const zip = await JSZip.loadAsync(fs.readFileSync(path.join(appRoot, "public/catalog-template.pptx")));
const x = await zip.file("ppt/slides/slide2.xml").async("string");
const pics = [...x.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)];
for (let i = 0; i < pics.length; i++) {
  const p = pics[i][0];
  const embed = p.match(/r:embed="(rId\d+)"/)?.[1];
  const ext = p.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
  console.log(`pic ${i + 1}: embed=${embed} size=${ext?.[1]}x${ext?.[2]}`);
}
