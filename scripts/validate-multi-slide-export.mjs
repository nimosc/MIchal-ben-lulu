import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

function stripNotesSlideRel(rels) {
  return rels.replace(
    /<Relationship[^>]*relationships\/notesSlide[^>]*\/>/g,
    ""
  );
}

function updateSlideRels(rels, opts) {
  let out = stripNotesSlideRel(rels);
  if (opts.mediaFile) {
    const target = `../media/${opts.mediaFile}`;
    out = out.replace(
      /(<Relationship Id="rId3" Type="[^"]*relationships\/image" Target=")\.\.\/media\/image2\.(png|jpe?g)("\/>)/i,
      `$1${target}$3`
    );
    out = out.replace(/Target="\.\.\/media\/image1\.(png|jpe?g)"/i, `Target="${target}"`);
  }
  return out;
}

const buf = fs.readFileSync(path.join(appRoot, "public/catalog-template.pptx"));
const zip = await JSZip.loadAsync(buf);
const catalogRels = await zip.file("ppt/slides/_rels/slide2.xml.rels").async("string");
const issues = [];

for (let slideNum = 2; slideNum <= 4; slideNum++) {
  const rels = updateSlideRels(catalogRels, { mediaFile: `catalog-${slideNum}.jpg` });
  if (rels.includes("notesSlide")) issues.push(`slide${slideNum}: still has notesSlide`);
  if (!rels.includes(`catalog-${slideNum}.jpg`)) issues.push(`slide${slideNum}: missing catalog image ref`);
  if (!rels.includes('Target="../media/catalog-')) issues.push(`slide${slideNum}: rId3 not patched`);
  const notesCount = (rels.match(/notesSlide/g) || []).length;
  if (notesCount > 0) issues.push(`slide${slideNum}: notes refs=${notesCount}`);
}

console.log(issues.length ? issues : "multi-slide rels OK");
