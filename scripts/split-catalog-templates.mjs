/**
 * מפצל catalog-template.pptx משולב ל-4 קבצי תבנית.
 * three-images = slide1 (תמונה אחת) + slide2 (2 תמונות) באותו קובץ.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const sourcePath =
  process.argv[2] || path.join(appRoot, "public/catalog-template.pptx");
const outDir = path.join(appRoot, "public/templates");

/** קובץ יחיד עם שקף אחד מתוך המקור */
const SINGLE_SLIDE_FILES = {
  "cover-template.pptx": 1,
  "single-image-template.pptx": 2,
  "two-images-template.pptx": 3,
};

async function buildSingleSlidePptx(srcZip, slideNum) {
  const outZip = new JSZip();
  for (const [name, file] of Object.entries(srcZip.files)) {
    if (file.dir) continue;
    if (name.startsWith("ppt/slides/slide") && !name.includes(`slide${slideNum}`)) continue;
    if (name.startsWith("ppt/slides/_rels/slide") && !name.includes(`slide${slideNum}`)) {
      continue;
    }
    if (name === "ppt/presentation.xml" || name === "ppt/_rels/presentation.xml.rels") continue;
    if (name === "[Content_Types].xml") continue;
    outZip.file(name, await file.async("nodebuffer"));
  }

  const slideXml = await srcZip.file(`ppt/slides/slide${slideNum}.xml`).async("string");
  const slideRels = await srcZip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`).async("string");
  outZip.file("ppt/slides/slide1.xml", slideXml);
  outZip.file("ppt/slides/_rels/slide1.xml.rels", slideRels);

  let pres = await srcZip.file("ppt/presentation.xml").async("string");
  pres = pres.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>'
  );
  outZip.file("ppt/presentation.xml", pres);

  let presRels = await srcZip.file("ppt/_rels/presentation.xml.rels").async("string");
  presRels = presRels.replace(
    /<Relationship Id="rId\d+" Type="[^"]*relationships\/slide"[^/]*\/>/g,
    ""
  );
  presRels = presRels.replace(
    "</Relationships>",
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>'
  );
  outZip.file("ppt/_rels/presentation.xml.rels", presRels);

  let ct = await srcZip.file("[Content_Types].xml").async("string");
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, "");
  if (!ct.includes('/ppt/slides/slide1.xml"')) {
    ct = ct.replace(
      "</Types>",
      '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'
    );
  }
  outZip.file("[Content_Types].xml", ct);

  return outZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function buildThreeImagesPptx(srcZip) {
  const outZip = new JSZip();
  for (const [name, file] of Object.entries(srcZip.files)) {
    if (file.dir) continue;
    if (name.match(/^ppt\/slides\/slide[34]/)) continue;
    if (name.match(/^ppt\/slides\/_rels\/slide[34]/)) continue;
    if (name === "ppt/presentation.xml" || name === "ppt/_rels/presentation.xml.rels") continue;
    if (name === "[Content_Types].xml") continue;
    outZip.file(name, await file.async("nodebuffer"));
  }

  const s1 = await srcZip.file("ppt/slides/slide2.xml").async("string");
  const r1 = await srcZip.file("ppt/slides/_rels/slide2.xml.rels").async("string");
  const s2 = await srcZip.file("ppt/slides/slide3.xml").async("string");
  const r2 = await srcZip.file("ppt/slides/_rels/slide3.xml.rels").async("string");
  outZip.file("ppt/slides/slide1.xml", s1);
  outZip.file("ppt/slides/_rels/slide1.xml.rels", r1);
  outZip.file("ppt/slides/slide2.xml", s2);
  outZip.file("ppt/slides/_rels/slide2.xml.rels", r2);

  let pres = await srcZip.file("ppt/presentation.xml").async("string");
  pres = pres.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst>'
  );
  outZip.file("ppt/presentation.xml", pres);

  let presRels = await srcZip.file("ppt/_rels/presentation.xml.rels").async("string");
  presRels = presRels.replace(
    /<Relationship Id="rId\d+" Type="[^"]*relationships\/slide"[^/]*\/>/g,
    ""
  );
  presRels = presRels.replace(
    "</Relationships>",
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/></Relationships>'
  );
  outZip.file("ppt/_rels/presentation.xml.rels", presRels);

  let ct = await srcZip.file("[Content_Types].xml").async("string");
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g, "");
  for (const n of [1, 2]) {
    const part = `/ppt/slides/slide${n}.xml`;
    if (!ct.includes(part)) {
      ct = ct.replace(
        "</Types>",
        `<Override PartName="${part}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
      );
    }
  }
  outZip.file("[Content_Types].xml", ct);

  return outZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

if (!fs.existsSync(sourcePath)) {
  console.error("לא נמצא:", sourcePath);
  process.exit(1);
}

const srcZip = await JSZip.loadAsync(fs.readFileSync(sourcePath));
fs.mkdirSync(outDir, { recursive: true });

for (const [filename, slideNum] of Object.entries(SINGLE_SLIDE_FILES)) {
  const buf = await buildSingleSlidePptx(srcZip, slideNum);
  fs.writeFileSync(path.join(outDir, filename), buf);
  console.log("wrote", path.join(outDir, filename));
}

const threeBuf = await buildThreeImagesPptx(srcZip);
fs.writeFileSync(path.join(outDir, "three-images-template.pptx"), threeBuf);
console.log("wrote", path.join(outDir, "three-images-template.pptx"));

console.log("Done.");
