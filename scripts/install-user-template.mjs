import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const userPath =
  process.argv[2] || "c:/Users/nimos/Desktop/catalog-template (1).pptx";
const outPublic = path.join(appRoot, "public/catalog-template.pptx");
const outVptx = path.join(
  path.dirname(appRoot),
  "_template_vptx_v2"
);

const MOUNTING_LABEL = "קישור לדף הוראות התקנת גוף תאורה";

async function unzipToDir(buf, dir) {
  const zip = await JSZip.loadAsync(buf);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [rel, file] of Object.entries(zip.files)) {
    if (file.dir) {
      fs.mkdirSync(path.join(dir, rel), { recursive: true });
      continue;
    }
    const content = await file.async("nodebuffer");
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

let buf = fs.readFileSync(userPath);
let zip = await JSZip.loadAsync(buf);

let slide2 = await zip.file("ppt/slides/slide2.xml")?.async("string");
if (!slide2) {
  console.error("חסר slide2");
  process.exit(1);
}

if (!slide2.includes("{{mountingInstructionsLabel}}")) {
  if (slide2.includes(MOUNTING_LABEL)) {
    slide2 = slide2.split(MOUNTING_LABEL).join("{{mountingInstructionsLabel}}");
    console.log("patched: full mounting label -> {{mountingInstructionsLabel}}");
  } else {
    slide2 = slide2.replace(
      /<a:t>קישור לדף הוראות התקנת גוף תאו<\/a:t>/,
      "<a:t>{{mountingInstructionsLabel}}</a:t>"
    );
    console.log("patched: partial mounting label -> {{mountingInstructionsLabel}}");
  }
  zip.file("ppt/slides/slide2.xml", slide2);
}

buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(outPublic, buf);
console.log("wrote", outPublic);

if (fs.existsSync(path.dirname(outVptx))) {
  await unzipToDir(buf, outVptx);
  console.log("wrote", outVptx);
}

console.log("done");
