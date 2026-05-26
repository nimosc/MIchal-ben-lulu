import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(appRoot, "package.json"));
const JSZip = require("jszip");

// Inline copies of export helpers + nasty data
const PLACEHOLDER_RE = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;
function escapeXmlText(v) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeXmlAttr(v) {
  return escapeXmlText(v).replace(/'/g, "&apos;");
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
    return next === text ? full : `<a:t>${next}</a:t>`;
  });
  out = out.replace(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g, (para) => {
    const runs = [...para.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
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

function patchMountingInstructionsLink(xml, mountingUrl, label) {
  const url = mountingUrl.trim();
  if (!url) return xml;
  const labelTag = `<a:t>${escapeXmlText(label)}</a:t>`;
  const idx = xml.indexOf(labelTag);
  if (idx === -1) return xml;
  const runStart = xml.lastIndexOf("<a:r>", idx);
  const runEnd = xml.indexOf("</a:r>", idx) + 5;
  if (runStart === -1 || runEnd <= runStart) return xml;
  let run = xml.slice(runStart, runEnd);
  const hlinkBlock =
    `<a:hlinkClick r:id="rId6" tooltip="${escapeXmlAttr(url)}">` +
    `<a:extLst><a:ext uri="{A12FA001-AC4F-418D-AE19-62706E023703}">` +
    `<ahyp:hlinkClr xmlns:ahyp="http://schemas.microsoft.com/office/drawing/2018/hyperlinkcolor" val="tx"/></a:ext></a:extLst></a:hlinkClick>`;
  if (!run.includes("hlinkClick")) {
    const escapedLabel = labelTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    run = run.replace(
      new RegExp(`(<a:rPr[^>]*>)([\\s\\S]*?)(</a:rPr>\\s*${escapedLabel})`),
      `$1$2${hlinkBlock}$3`
    );
  }
  return xml.slice(0, runStart) + run + xml.slice(runEnd);
}

const nastyVars = {
  mark: 'A1 & "test"',
  productTitle: "מוצר <script>",
  description: "תיאור עם \u0001 control",
  cri: "90<",
  lightSource: "LED & halogen",
  productUrl: "https://example.com/p?a=1&b=2",
  mountingInstructionsUrl: "https://example.com/mount.pdf",
  mountingInstructionsLabel: "קישור לדף הוראות התקנת גוף תאורה",
  manufacturer: "M",
  modelManufacturer: "X",
  sku: "1",
  roomNames: "חדר",
  lumens: "1",
  colorTemp: "3K",
  watt: "1W",
  voltageCurrent: "24V",
  totalUnits: "1",
  unitLabel: "יח",
  ip: "IP20",
  reflector: "",
  lensCover: "",
  beamAngle: "",
  adjustment: "",
  lightDistribution: "",
  lampLife: "",
  efficiency: "",
  glare: "",
  driverLocation: "",
  dimmingMethod: "",
  finishColor: "",
  bodyDiameter: "",
  bodyWidth: "",
  bodyHeight: "",
  rosetteType: "",
  importer: "",
  footerNote1: "",
  footerNote2: "",
};

const buf = fs.readFileSync(path.join(appRoot, "public/catalog-template.pptx"));
const zip = await JSZip.loadAsync(buf);
let catalog = await zip.file("ppt/slides/slide2.xml").async("string");
catalog = applyTemplateVariables(catalog, nastyVars);
catalog = patchMountingInstructionsLink(
  catalog,
  nastyVars.mountingInstructionsUrl,
  nastyVars.mountingInstructionsLabel
);

const issues = [];
if (catalog.includes("{{")) issues.push("unfilled placeholders remain");
if (catalog.includes(">>") || catalog.includes("<<")) issues.push("double angle brackets");
if (catalog.match(/<a:t>[^<]*<[^/]/)) issues.push("unescaped < in a:t");

// try parse with simple check - unclosed tags count
const openTags = (catalog.match(/<a:t>/g) || []).length;
const closeTags = (catalog.match(/<\/a:t>/g) || []).length;
if (openTags !== closeTags) issues.push(`a:t mismatch ${openTags} vs ${closeTags}`);

fs.writeFileSync(path.join(appRoot, "public/test-slide2.xml"), catalog);
console.log(issues.length ? issues : "slide xml looks OK");
console.log("wrote public/test-slide2.xml for manual inspect");
