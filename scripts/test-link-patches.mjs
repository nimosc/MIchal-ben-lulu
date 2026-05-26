import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MOUNTING_LABEL = "קישור לדף הוראות התקנת גוף תאורה";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function extractShape(xml, shapeName) {
  const marker = `name="${shapeName}"`;
  const nameIdx = xml.indexOf(marker);
  if (nameIdx === -1) return null;
  const start = xml.lastIndexOf("<p:sp>", nameIdx);
  const end = xml.indexOf("</p:sp>", nameIdx) + 7;
  return { start, end, shape: xml.slice(start, end) };
}

function patchMounting(xml, url) {
  const labelTag = `<a:t>${MOUNTING_LABEL}</a:t>`;
  const idx = xml.indexOf(labelTag);
  const runStart = xml.lastIndexOf("<a:r>", idx);
  const runEnd = xml.indexOf("</a:r>", idx) + 5;
  let run = xml.slice(runStart, runEnd);
  const hlinkBlock = `<a:hlinkClick r:id="rId6" tooltip="${url}"></a:hlinkClick>`;
  run = run.replace(
    new RegExp(
      `(<a:rPr[^>]*>)([\\s\\S]*?)(</a:rPr>\\s*<a:t>${MOUNTING_LABEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</a:t>)`
    ),
    `$1$2${hlinkBlock}$3`
  );
  return xml.slice(0, runStart) + run + xml.slice(runEnd);
}

function patchProduct(xml, productUrl) {
  const block = extractShape(xml, "TextBox 13");
  let shape = block.shape;
  shape = shape.replace(/<a:off x="\d+" y="-?\d+"/, `<a:off x="1030929" y="17650000"`);
  const displayUrl =
    productUrl.trim() ||
    shape.match(/<a:t>(https:\/\/[^<]+)<\/a:t>/)?.[1] ||
    "";
  if (displayUrl) {
    shape = shape.replace(
      /<a:t>https:\/\/www\.davidegroppi\.com\/en\/products\/[^<]+<\/a:t>/,
      `<a:t>${displayUrl}</a:t>`
    );
  }
  return xml.slice(0, block.start) + shape + xml.slice(block.end);
}

const templateXml = fs.readFileSync(
  path.join(root, "..", "_template_vptx_v2/ppt/slides/slide2.xml"),
  "utf8"
);

let xml = templateXml;
xml = patchProduct(xml, "");
xml = patchMounting(xml, "https://example.com/mount.pdf");

const tb13 = extractShape(xml, "TextBox 13");
const off = tb13.shape.match(/<a:off x="(\d+)" y="(-?\d+)"/);
const idx = xml.indexOf(MOUNTING_LABEL);
const run = xml.slice(xml.lastIndexOf("<a:r>", idx), xml.indexOf("</a:r>", idx) + 5);

console.log({
  productOff: off?.slice(1),
  productVisible: tb13.shape.includes("https://"),
  mountHasHlink: run.includes("hlinkClick"),
  mountXmlValid: !run.includes(">>") && !run.includes("><>"),
  mountSnippet: run.slice(0, 200),
});
