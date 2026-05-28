import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const pptxPath = process.argv[2];
if (!pptxPath) {
  console.error("usage: node inspect-pptx.mjs <path>");
  process.exit(1);
}

const buf = fs.readFileSync(pptxPath);
const zip = await JSZip.loadAsync(buf);

const names = Object.keys(zip.files)
  .filter((n) => /slide|media|rels/i.test(n))
  .sort();
console.log("FILES:\n" + names.join("\n"));

for (const s of ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml"]) {
  const f = zip.file(s);
  if (!f) continue;
  const xml = await f.async("string");
  const blips = [...xml.matchAll(/<a:blip\b[^>]*>/gi)].map((m) => m[0]);
  const pics = (xml.match(/<p:pic\b/gi) || []).length;
  console.log(`\n=== ${s} pics=${pics} blips=${blips.length}`);
  blips.forEach((b, i) => console.log(`  ${i}: ${b}`));
  const spRe = /<p:sp>[\s\S]*?<\/p:sp>/gi;
  let spIdx = 0;
  for (const sp of xml.match(spRe) || []) {
    if (!sp.includes("<a:blip")) continue;
    const name = sp.match(/name="([^"]+)"/)?.[1] ?? "?";
    const embed = sp.match(/r:embed="(rId\d+)"/)?.[1] ?? "?";
    const cx = sp.match(/<a:ext cx="(\d+)"/)?.[1];
    const cy = sp.match(/<a:ext cy="(\d+)"/)?.[1];
    const off = sp.match(/<a:off x="(\d+)" y="(\d+)"/);
    const x = off?.[1];
    const y = off?.[2];
    console.log(`  shape[${spIdx++}] name=${name} embed=${embed} x=${x} y=${y} cx=${cx} cy=${cy}`);
  }
}

for (const r of [
  "ppt/slides/_rels/slide1.xml.rels",
  "ppt/slides/_rels/slide2.xml.rels",
]) {
  const f = zip.file(r);
  if (!f) continue;
  const rels = await f.async("string");
  console.log(`\n=== ${r}`);
  for (const m of rels.matchAll(
    /<Relationship[^>]*Type="[^"]*relationships\/image"[^>]*\/>/gi
  )) {
    console.log(" ", m[0]);
  }
}
