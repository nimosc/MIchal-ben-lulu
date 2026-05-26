import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

const SLIDE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

function collectUsedRIds(relsXml) {
  const used = new Set();
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) used.add(parseInt(m[1], 10));
  return used;
}

function patchPresentationRels(baseRels, slideCount) {
  const withoutSlides = baseRels.replace(
    /<Relationship Id="rId\d+" Type="[^"]*relationships\/slide" Target="slides\/slide\d+\.xml"[^/]*\/>/g,
    ""
  );
  const used = collectUsedRIds(withoutSlides);
  const slideRIds = [];
  const newSlideRels = [];
  let candidate = 1;
  for (let i = 0; i < slideCount; i++) {
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

const PLACEHOLDER_RE = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;
function escapeXmlText(v) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function replacePlaceholdersInText(text, vars) {
  return text.replace(PLACEHOLDER_RE, (match, key) => {
    if (!(key in vars)) return match;
    return vars[key] ? escapeXmlText(vars[key]) : "";
  });
}
function applyTemplateVariables(xml, vars) {
  let out = xml.replace(/<a:t>([^<]*)<\/a:t>/g, (full, text) => {
    const next = replacePlaceholdersInText(text, vars);
    if (next === text) return full;
    return `<a:t>${next}</a:t>`;
  });
  out = out.replace(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g, (para) => {
    const runs = [...para.matchAll(/<a:t>(([^<]*))<\/a:t>/g)];
    if (!runs.length) return para;
    const combined = runs.map((r) => r[1]).join("");
    if (!combined.includes("{{")) return para;
    const replaced = replacePlaceholdersInText(combined, vars);
    if (replaced === combined) return para;
    let runIdx = 0;
    return para.replace(/<a:t>([^<]*)<\/a:t>/g, () => {
      runIdx += 1;
      return runIdx === 1 ? `<a:t>${replaced}</a:t>` : `<a:t></a:t>`;
    });
  });
  return out;
}

const mockVars = {
  mark: "A1",
  productTitle: "TEST",
  lightSource: "LED",
  productUrl: "https://example.com/p",
  mountingInstructionsUrl: "https://example.com/m.pdf",
  mountingInstructionsLabel: "קישור לדף הוראות התקנת גוף תאורה",
};

const buf = fs.readFileSync(path.join(appRoot, "public/catalog-template.pptx"));
const zip = await JSZip.loadAsync(buf);
const cover = await zip.file("ppt/slides/slide1.xml").async("string");
const catalog = await zip.file("ppt/slides/slide2.xml").async("string");
const rels = await zip.file("ppt/slides/_rels/slide2.xml.rels").async("string");
const pres = await zip.file("ppt/presentation.xml").async("string");
const presRels = await zip.file("ppt/_rels/presentation.xml.rels").async("string");

const slideCount = 3;
zip.remove("ppt/slides/slide2.xml");
zip.remove("ppt/slides/_rels/slide2.xml.rels");

zip.file("ppt/slides/slide1.xml", applyTemplateVariables(cover, { projectName: "P", floorName: "F", editionLine: "E", year: "2026" }));
for (let i = 0; i < slideCount - 1; i++) {
  const n = i + 2;
  zip.file(`ppt/slides/slide${n}.xml`, applyTemplateVariables(catalog, mockVars));
  zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, rels);
}

const { rels: newPresRels, slideRIds } = patchPresentationRels(presRels, slideCount);
zip.file("ppt/presentation.xml", patchPresentationXml(pres, slideRIds));
zip.file("ppt/_rels/presentation.xml.rels", newPresRels);

const out = await zip.generateAsync({ type: "nodebuffer" });
const z2 = await JSZip.loadAsync(out);
const s2 = await z2.file("ppt/slides/slide2.xml").async("string");
const pres2 = await z2.file("ppt/presentation.xml").async("string");
const presRels2 = await z2.file("ppt/_rels/presentation.xml.rels").async("string");

console.log("{{mark}} gone:", !s2.includes("{{mark}}"));
console.log("{{lightSource}} gone:", !s2.includes("{{lightSource}}"));
console.log("slide count in pres:", (pres2.match(/<p:sldId/g) || []).length);
console.log("master still rId5:", pres2.includes('r:id="rId5"'));
console.log("slide rels:", [...presRels2.matchAll(/Target="slides\/slide\d+\.xml"/g)].map((m) => m[0]));
console.log("no font rels:", !presRels2.includes("font1.fntdata"));
