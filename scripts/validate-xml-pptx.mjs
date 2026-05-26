import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { DOMParser } from "@xmldom/xmldom";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"));
let DOMParserImpl = DOMParser;
try {
  require.resolve("@xmldom/xmldom");
} catch {
  DOMParserImpl = null;
}

const JSZip = require("jszip");
const pptxPath = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/validate-export.pptx");

const buf = fs.readFileSync(pptxPath);
const zip = await JSZip.loadAsync(buf);
const failures = [];

for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir || !name.endsWith(".xml")) continue;
  const text = await entry.async("string");
  if (text.includes(">>") || text.includes("<<")) {
    failures.push(`${name}: contains >> or <<`);
  }
  try {
    if (DOMParserImpl) {
      const doc = new DOMParserImpl().parseFromString(text, "application/xml");
      const err = doc.getElementsByTagName("parsererror")[0];
      if (err) failures.push(`${name}: ${err.textContent?.slice(0, 120)}`);
    } else {
      // basic check
      if (!text.includes("<?xml")) failures.push(`${name}: no xml decl`);
    }
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}

// Relationship integrity
const presRels = await zip.file("ppt/_rels/presentation.xml.rels").async("string");
for (const m of presRels.matchAll(/Target="([^"]+)"/g)) {
  const t = m[1];
  if (t.startsWith("http")) continue;
  const p = t.startsWith("/") ? t.slice(1) : `ppt/${t}`;
  if (!zip.file(p)) failures.push(`pres rel missing: ${p}`);
}

console.log("file:", pptxPath);
console.log(failures.length ? failures.join("\n") : "all xml parts OK");
