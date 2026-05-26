import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  path.join(root, "public/catalog-template.pptx"),
  path.join(root, "..", "_template_vptx_v2/ppt/slides/slide2.xml"),
];

async function loadSlideXml() {
  const pptx = candidates[0];
  if (fs.existsSync(pptx)) {
    const JSZip = (await import("jszip")).default;
    const buf = fs.readFileSync(pptx);
    const zip = await JSZip.loadAsync(buf);
    return { source: pptx, xml: await zip.file("ppt/slides/slide2.xml").async("string") };
  }
  return {
    source: candidates[1],
    xml: fs.readFileSync(candidates[1], "utf8"),
  };
}

function extractShape(xml, shapeName) {
  const marker = `name="${shapeName}"`;
  const nameIdx = xml.indexOf(marker);
  if (nameIdx === -1) return null;
  const start = xml.lastIndexOf("<p:sp>", nameIdx);
  const end = xml.indexOf("</p:sp>", nameIdx) + 7;
  return { start, end, shape: xml.slice(start, end) };
}

const { source, xml: templateXml } = await loadSlideXml();
console.log("source:", source);

const tb13 = extractShape(templateXml, "TextBox 13");
const offs = [...tb13.shape.matchAll(/<a:off x="(\d+)" y="(-?\d+)"/g)].map((m) => m.slice(1));
console.log("TextBox 13 all offs:", offs);
console.log("has hlink:", tb13.shape.includes("hlinkClick"));
console.log("text runs:", [...tb13.shape.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]));

// simulate patch (first off only - current code)
let shape = tb13.shape;
shape = shape.replace(/<a:off x="\d+" y="-?\d+"/, `<a:off x="1030929" y="17650000"`);
const offsAfter = [...shape.matchAll(/<a:off x="(\d+)" y="(-?\d+)"/g)].map((m) => m.slice(1));
console.log("after patch offs:", offsAfter);
