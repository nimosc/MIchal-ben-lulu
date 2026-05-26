import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateDir = path.join(root, "..", "_template_vptx_v2");

function extractShape(xml, name) {
  const i = xml.indexOf(`name="${name}"`);
  if (i === -1) return null;
  const start = xml.lastIndexOf("<p:sp>", i);
  const end = xml.indexOf("</p:sp>", i) + 7;
  return xml.slice(start, end);
}

const slideXml = fs.readFileSync(
  path.join(templateDir, "ppt/slides/slide2.xml"),
  "utf8"
);
const rels = fs.readFileSync(
  path.join(templateDir, "ppt/slides/_rels/slide2.xml.rels"),
  "utf8"
);

const productUrl = "https://example.com/product";
const mountingUrl = "https://example.com/mount.pdf";

let xml = slideXml;
const tb13 = extractShape(xml, "TextBox 13");
let shape = tb13;
shape = shape.replace(/<a:off x="\d+" y="-?\d+"/, `<a:off x="1030929" y="17650000"`);
shape = shape.replace(
  /<a:t>https:\/\/www\.davidegroppi\.com\/en\/products\/[^<]+<\/a:t>/,
  `<a:t>${productUrl}</a:t>`
);
xml = xml.replace(tb13, shape);

const label = "קישור לדף הוראות התקנת גוף תאורה";
const idx = xml.indexOf(`<a:t>${label}</a:t>`);
const runStart = xml.lastIndexOf("<a:r>", idx);
const runEnd = xml.indexOf("</a:r>", idx) + 5;
let run = xml.slice(runStart, runEnd);
run = run.replace(
  /(<a:rPr[^>]*)(>)/,
  `$1><a:hlinkClick r:id="rId6" tooltip="${mountingUrl}"></a:hlinkClick>`
);
xml = xml.slice(0, runStart) + run + xml.slice(runEnd);

let outRels = rels.replace(
  /(<Relationship Id="rId5"[^>]*Target=")[^"]+/,
  `$1${productUrl}`
);
outRels = outRels.replace(
  "</Relationships>",
  `<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${mountingUrl}" TargetMode="External"/></Relationships>`
);

const tb13After = extractShape(xml, "TextBox 13");
const off = tb13After.match(/<a:off x="(\d+)" y="(-?\d+)"/);
const hasProduct = tb13After.includes(productUrl);
const hasMountHlink = xml.includes(`<a:t>${label}</a:t>`) && xml.includes('r:id="rId6"');
const hasRels5 = outRels.includes(`rId5`) && outRels.includes(productUrl);
const hasRels6 = outRels.includes(mountingUrl);

console.log({
  productOff: off?.slice(1),
  hasProductInBox: hasProduct,
  mountingLabelKept: xml.includes(`<a:t>${label}</a:t>`),
  mountingHlink: hasMountHlink,
  relsProduct: hasRels5,
  relsMounting: hasRels6,
  ok: off?.[2] === "17650000" && hasProduct && hasMountHlink && hasRels5 && hasRels6,
});
