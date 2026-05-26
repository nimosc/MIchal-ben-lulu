import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const templatePath = path.join(appRoot, "public/catalog-template.pptx");
if (!fs.existsSync(templatePath)) {
  console.error("missing template", templatePath);
  process.exit(1);
}

// Mirror export logic minimally
const buf = fs.readFileSync(templatePath);
const zip = await JSZip.loadAsync(buf);

const slideCount = 4; // 1 cover + 3 catalog
const catalogTemplate = await zip.file("ppt/slides/slide2.xml").async("string");
const catalogRels = await zip.file("ppt/slides/_rels/slide2.xml.rels").async("string");
const pres = await zip.file("ppt/presentation.xml").async("string");
const presRels = await zip.file("ppt/_rels/presentation.xml.rels").async("string");
let ct = await zip.file("[Content_Types].xml").async("string");

zip.remove("ppt/slides/slide2.xml");
zip.remove("ppt/slides/_rels/slide2.xml.rels");

for (let i = 2; i <= slideCount; i++) {
  zip.file(`ppt/slides/slide${i}.xml`, catalogTemplate);
  zip.file(`ppt/slides/_rels/slide${i}.xml.rels`, catalogRels);
}

// patch presentation (copy from export)
const SLIDE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
function collectUsedRIds(relsXml) {
  const used = new Set();
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) used.add(parseInt(m[1], 10));
  return used;
}
function patchPresentationRels(baseRels, count) {
  const withoutSlides = baseRels.replace(
    /<Relationship Id="rId\d+" Type="[^"]*relationships\/slide" Target="slides\/slide\d+\.xml"[^/]*\/>/g,
    ""
  );
  const used = collectUsedRIds(withoutSlides);
  const slideRIds = [];
  const newSlideRels = [];
  let candidate = 1;
  for (let i = 0; i < count; i++) {
    while (used.has(candidate)) candidate += 1;
    const rid = `rId${candidate}`;
    used.add(candidate);
    slideRIds.push(rid);
    newSlideRels.push(
      `<Relationship Id="${rid}" Type="${SLIDE_REL_TYPE}" Target="slides/slide${i + 1}.xml"/>`
    );
    candidate += 1;
  }
  return {
    rels: withoutSlides.replace("</Relationships>", `${newSlideRels.join("")}</Relationships>`),
    slideRIds,
  };
}
function patchPresentationXml(basePres, slideRIds) {
  const sldIds = slideRIds.map((rId, i) => `<p:sldId id="${256 + i}" r:id="${rId}"/>`).join("");
  return basePres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIds}</p:sldIdLst>`);
}
function patchContentTypes(ct, count) {
  let out = ct.replace(/<Override PartName="\/ppt\/slides\/slide2\.xml"[^/]*\/>/g, "");
  for (let i = 1; i <= count; i++) {
    const part = `/ppt/slides/slide${i}.xml`;
    if (!out.includes(part)) {
      out = out.replace(
        "</Types>",
        `<Override PartName="${part}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
      );
    }
  }
  return out;
}

const { rels, slideRIds } = patchPresentationRels(presRels, slideCount);
zip.file("ppt/presentation.xml", patchPresentationXml(pres, slideRIds));
zip.file("ppt/_rels/presentation.xml.rels", rels);
zip.file("[Content_Types].xml", patchContentTypes(ct, slideCount));

const outPath = path.join(appRoot, "public/validate-export.pptx");
fs.writeFileSync(outPath, await zip.generateAsync({ type: "nodebuffer" }));

const z2 = await JSZip.loadAsync(fs.readFileSync(outPath));
const issues = [];

// slides in presentation vs zip
const pres2 = await z2.file("ppt/presentation.xml").async("string");
const presRels2 = await z2.file("ppt/_rels/presentation.xml.rels").async("string");
const ct2 = await z2.file("[Content_Types].xml").async("string");

const slideFiles = Object.keys(z2.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
const presSlideTargets = [...presRels2.matchAll(/Target="slides\/(slide\d+\.xml)"/g)].map((m) => m[1]);

console.log("slide files:", slideFiles);
console.log("pres slide targets:", presSlideTargets);

for (const target of presSlideTargets) {
  if (!z2.file(`ppt/slides/${target}`)) issues.push(`missing slide part: ${target}`);
}

// orphan notes slides
const notesSlides = Object.keys(z2.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f));
console.log("notes slides in zip:", notesSlides.length);

// each catalog slide rels points to notesSlide2 - duplicate?
for (const sf of slideFiles) {
  const n = sf.match(/slide(\d+)/)[1];
  const relsPath = `ppt/slides/_rels/slide${n}.xml.rels`;
  if (!z2.file(relsPath)) issues.push(`missing rels: ${relsPath}`);
  else {
    const sr = await z2.file(relsPath).async("string");
    for (const m of sr.matchAll(/Target="([^"]+)"/g)) {
      const t = m[1];
      const resolved = t.startsWith("../") ? `ppt/${t.replace(/^\.\.\//, "")}` : t;
      if (!z2.file(resolved) && !z2.file(resolved.replace("notesSlides/", "notesSlides/"))) {
        // try resolve
        const full = path.posix.join("ppt/slides", t).replace(/\\/g, "/");
        const norm = full.replace(/\/ppt\/slides\/\.\.\//, "/ppt/");
        if (!z2.file(norm)) issues.push(`broken ref in ${relsPath}: ${t} -> ${norm}`);
      }
    }
  }
}

// content types for all slides
for (let i = 1; i <= slideCount; i++) {
  if (!ct2.includes(`/ppt/slides/slide${i}.xml`)) issues.push(`CT missing slide${i}`);
}

// extra slide2 in CT after patch?
const slide2ct = (ct2.match(/slide2\.xml/g) || []).length;
if (slide2ct > 1) issues.push(`duplicate slide2 in CT: ${slide2ct}`);

// check XML well-formed (basic)
for (const sf of slideFiles) {
  const xml = await z2.file(sf).async("string");
  if (xml.includes(">>") || xml.includes("<<")) issues.push(`bad xml chars in ${sf}`);
  if (!xml.startsWith("<?xml")) issues.push(`no xml decl ${sf}`);
}

console.log("\nISSUES:", issues.length ? issues : "none");
console.log("wrote", outPath);
