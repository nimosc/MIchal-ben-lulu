import type { CatalogSlideContext, CoverSlideContext } from "@/lib/catalogSlideFill";
import { CATALOG_FOOTER_NOTES } from "@/lib/catalogPresentation";

/** טקסט ברירת מחדל לקישור הוראות התקנה בתבנית */
export const DEFAULT_MOUNTING_INSTRUCTIONS_LABEL =
  "קישור לדף הוראות התקנת גוף תאורה";

/** שמות משתנים בתבנית — בפורמט {{שם_משתנה}} */
export const CATALOG_TEMPLATE_VAR_NAMES = [
  "projectName",
  "floorName",
  "editionLine",
  "year",
  "mark",
  "productTitle",
  "manufacturer",
  "modelManufacturer",
  "sku",
  "roomNames",
  "description",
  "cri",
  "lumens",
  "colorTemp",
  "watt",
  "voltageCurrent",
  "totalUnits",
  "unitLabel",
  "ip",
  "lightSource",
  "productUrl",
  "mountingInstructionsUrl",
  "mountingInstructionsLabel",
  "reflector",
  "lensCover",
  "beamAngle",
  "adjustment",
  "lightDistribution",
  "lampLife",
  "efficiency",
  "glare",
  "driverLocation",
  "dimmingMethod",
  "finishColor",
  "bodyDiameter",
  "bodyWidth",
  "bodyHeight",
  "rosetteType",
  "importer",
  "footerNote1",
  "footerNote2",
] as const;

export type CatalogTemplateVarName = (typeof CATALOG_TEMPLATE_VAR_NAMES)[number];

const PLACEHOLDER_RE = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;

/** תווים לא חוקיים ב-XML 1.0 — PowerPoint מסרב לפתוח את הקובץ */
export function sanitizeXmlString(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "");
}

export function escapeXmlText(value: string): string {
  return sanitizeXmlString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildModelManufacturerLine(ctx: CatalogSlideContext): string {
  const model = ctx.sku.trim();
  const manufacturer = ctx.manufacturerSuffix.replace(/^_/, "").trim();
  if (model) return model;
  return manufacturer;
}

export function buildCoverTemplateVars(ctx: CoverSlideContext): Record<string, string> {
  return {
    projectName: ctx.projectName,
    floorName: ctx.floorName,
    editionLine: ctx.editionLine,
    year: ctx.year,
  };
}

export function buildCatalogTemplateVars(ctx: CatalogSlideContext): Record<string, string> {
  const manufacturer = ctx.manufacturerSuffix.replace(/^_/, "").trim();
  return {
    projectName: ctx.projectName,
    mark: ctx.mark,
    productTitle: ctx.productTitle,
    manufacturer,
    modelManufacturer: buildModelManufacturerLine(ctx),
    sku: ctx.sku,
    roomNames: ctx.roomNames,
    description: ctx.description?.trim() || "",
    cri: ctx.cri || "",
    lumens: ctx.lumens || "",
    colorTemp: ctx.colorTemp || "",
    watt: ctx.watt || "",
    voltageCurrent: ctx.voltageCurrent || "",
    totalUnits: ctx.totalUnits ? String(ctx.totalUnits) : "",
    unitLabel: ctx.unitLabel || "",
    ip: ctx.ip || "",
    lightSource: ctx.lightSource?.trim() || "",
    productUrl: ctx.productUrl?.trim() || "",
    mountingInstructionsUrl: ctx.mountingUrl?.trim() || "",
    mountingInstructionsLabel: DEFAULT_MOUNTING_INSTRUCTIONS_LABEL,
    reflector: ctx.reflector || "",
    lensCover: ctx.lensCover || "",
    beamAngle: ctx.beamAngle || "",
    adjustment: ctx.adjustment || "",
    lightDistribution: ctx.lightDistribution || "",
    lampLife: ctx.lampLife || "",
    efficiency: ctx.efficiency || "",
    glare: ctx.glare || "",
    driverLocation: ctx.driverLocation || "",
    dimmingMethod: ctx.dimmingMethod || "",
    finishColor: ctx.finishColor || "",
    bodyDiameter: ctx.bodyDiameter || "",
    bodyWidth: ctx.bodyWidth || "",
    bodyHeight: ctx.bodyHeight || "",
    rosetteType: ctx.rosetteType || "",
    importer: ctx.importer || "",
    footerNote1: CATALOG_FOOTER_NOTES[0] ?? "",
    footerNote2: CATALOG_FOOTER_NOTES[1] ?? "",
  };
}

function replacePlaceholdersInText(text: string, vars: Record<string, string>): string {
  return text.replace(PLACEHOLDER_RE, (match: string, key: string) => {
    if (!(key in vars)) return match;
    const val = vars[key];
    return val ? escapeXmlText(val) : "";
  });
}

/** מחליף {{משתנה}} בתוך ריצות <a:t>; פסקאות עם placeholder שבור על כמה ריצות — מאחד לריצה הראשונה */
export function applyTemplateVariables(
  xml: string,
  vars: Record<string, string>
): string {
  let out = xml.replace(/<a:t>([^<]*)<\/a:t>/g, (full, text) => {
    const next = replacePlaceholdersInText(text, vars);
    if (next === text) return full;
    return `<a:t>${next}</a:t>`;
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

export function readProductUrlFromSlide(xml: string): string {
  const m = xml.match(/<a:t>\{\{productUrl\}\}<\/a:t>/);
  if (m) return "";
  const url = xml.match(/<a:t>(https?:\/\/[^<]+)<\/a:t>/);
  return url?.[1] ?? "";
}

/** מוסיף hyperlink (rId6) לריצת טקסט של הוראות התקנה — אחרי מילוי {{משתנים}} */
export function patchMountingInstructionsLink(
  xml: string,
  mountingUrl: string,
  label: string = DEFAULT_MOUNTING_INSTRUCTIONS_LABEL
): string {
  const url = mountingUrl.trim();
  if (!url) return xml;

  const labelTexts = [
    label.trim() || DEFAULT_MOUNTING_INSTRUCTIONS_LABEL,
    DEFAULT_MOUNTING_INSTRUCTIONS_LABEL,
    "קישור לדף הוראות התקנת גוף תאו",
  ];
  const labelTags = Array.from(
    new Set(labelTexts.map((t) => `<a:t>${escapeXmlText(t)}</a:t>`))
  );

  let idx = -1;
  let labelTag = "";
  for (const tag of labelTags) {
    const i = xml.indexOf(tag);
    if (i !== -1) {
      idx = i;
      labelTag = tag;
      break;
    }
  }
  if (idx === -1) return xml;

  const runStart = xml.lastIndexOf("<a:r>", idx);
  const runEnd = xml.indexOf("</a:r>", idx) + 5;
  if (runStart === -1 || runEnd <= runStart) return xml;

  let run = xml.slice(runStart, runEnd);
  const hlinkBlock =
    `<a:hlinkClick r:id="rId6" tooltip="${escapeXmlAttr(url)}">` +
    `<a:extLst><a:ext uri="{A12FA001-AC4F-418D-AE19-62706E023703}">` +
    `<ahyp:hlinkClr xmlns:ahyp="http://schemas.microsoft.com/office/drawing/2018/hyperlinkcolor" val="tx"/></a:ext></a:extLst></a:hlinkClick>`;

  if (run.includes("hlinkClick")) {
    run = run.replace(/r:id="rId\d+"/, `r:id="rId6"`);
    run = run.replace(/tooltip="[^"]+"/, `tooltip="${escapeXmlAttr(url)}"`);
  } else {
    const escapedLabel = labelTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    run = run.replace(
      new RegExp(`(<a:rPr[^>]*>)([\\s\\S]*?)(</a:rPr>\\s*${escapedLabel})`),
      `$1$2${hlinkBlock}$3`
    );
  }

  return xml.slice(0, runStart) + run + xml.slice(runEnd);
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/'/g, "&apos;");
}
