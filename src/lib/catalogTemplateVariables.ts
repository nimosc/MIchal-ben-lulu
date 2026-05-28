import type { CatalogSlideContext, CoverSlideContext } from "@/lib/catalogSlideFill";
import { CATALOG_FOOTER_NOTES } from "@/lib/catalogPresentation";

/** טקסט ברירת מחדל לקישור הוראות התקנה בתבנית */
export const DEFAULT_MOUNTING_INSTRUCTIONS_LABEL =
  "קישור לדף הוראות התקנת גוף תאורה";

/** שמות משתנים בתבנית — בפורמט {{שם_משתנה}} */
export const CATALOG_TEMPLATE_VAR_NAMES = [
  "שם_פרויקט",
  "שם_קומה",
  "מהדורה",
  "שנה",
  "סימון",
  "שם_מוצר",
  "יצרן",
  "דגם_יצרן",
  "מקט",
  "חדרים",
  "תיאור",
  "cri",
  "לומן",
  "טמפרטורת_צבע",
  "וואט",
  "מתח_זרם",
  "כמות_כוללת",
  "יחידת_מידה",
  "ip",
  "מקור_אור",
  "קישור_מוצר",
  "קישור_הוראות_התקנה",
  "תווית_הוראות_התקנה",
  "רפלקטור",
  "עדשה_כיסוי",
  "זווית_הארה",
  "כיוונון",
  "פיזור_אור",
  "אורך_חיים",
  "יעילות",
  "סינוור",
  "מיקום_ציוד_עזר",
  "שיטת_שליטה",
  "צבע_גמר",
  "קוטר_גוף",
  "רוחב_גוף",
  "גובה_גוף",
  "סוג_רוזטה",
  "יבואן",
  "הערה1",
  "הערה2",
] as const;

export type CatalogTemplateVarName = (typeof CATALOG_TEMPLATE_VAR_NAMES)[number];

const PLACEHOLDER_RE = /\{\{([a-zA-Zא-ת][a-zA-Z0-9א-ת_]*)\}\}/g;

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
    שם_פרויקט: ctx.projectName,
    שם_קומה: ctx.floorName,
    מהדורה: ctx.editionLine,
    שנה: ctx.year,
  };
}

export function buildCatalogTemplateVars(ctx: CatalogSlideContext): Record<string, string> {
  const manufacturer = ctx.manufacturerSuffix.replace(/^_/, "").trim();
  return {
    שם_פרויקט: ctx.projectName,
    שם_קומה: ctx.floorName || "",
    סימון: ctx.mark,
    שם_מוצר: ctx.productTitle,
    יצרן: manufacturer,
    דגם_יצרן: buildModelManufacturerLine(ctx),
    מקט: ctx.sku,
    חדרים: ctx.roomNames,
    תיאור: ctx.description?.trim() || "",
    cri: ctx.cri || "",
    לומן: ctx.lumens || "",
    טמפרטורת_צבע: ctx.colorTemp || "",
    וואט: ctx.watt || "",
    מתח_זרם: ctx.voltageCurrent || "",
    כמות_כוללת: ctx.totalUnits ? String(ctx.totalUnits) : "",
    יחידת_מידה: ctx.unitLabel || "",
    ip: ctx.ip || "",
    מקור_אור: ctx.lightSource?.trim() || "",
    קישור_מוצר: ctx.productUrl?.trim() || "",
    קישור_הוראות_התקנה: ctx.mountingUrl?.trim() || "",
    תווית_הוראות_התקנה: DEFAULT_MOUNTING_INSTRUCTIONS_LABEL,
    רפלקטור: ctx.reflector || "",
    עדשה_כיסוי: ctx.lensCover || "",
    זווית_הארה: ctx.beamAngle || "",
    כיוונון: ctx.adjustment || "",
    פיזור_אור: ctx.lightDistribution || "",
    אורך_חיים: ctx.lampLife || "",
    יעילות: ctx.efficiency || "",
    סינוור: ctx.glare || "",
    מיקום_ציוד_עזר: ctx.driverLocation || "",
    שיטת_שליטה: ctx.dimmingMethod || "",
    צבע_גמר: ctx.finishColor || "",
    קוטר_גוף: ctx.bodyDiameter || "",
    רוחב_גוף: ctx.bodyWidth || "",
    גובה_גוף: ctx.bodyHeight || "",
    סוג_רוזטה: ctx.rosetteType || "",
    יבואן: ctx.importer || "",
    הערה1: CATALOG_FOOTER_NOTES[0] ?? "",
    הערה2: CATALOG_FOOTER_NOTES[1] ?? "",
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
  const m = xml.match(/<a:t>\{\{קישור_מוצר\}\}<\/a:t>/);
  if (m) return "";
  const url = xml.match(/<a:t>(https?:\/\/[^<]+)<\/a:t>/);
  return url?.[1] ?? "";
}

/** מוסיף hyperlink (rId6) לריצת טקסט של הוראות התקנה — אחרי מילוי {{משתנים}} */
export function patchMountingInstructionsLink(
  xml: string,
  mountingUrl: string | undefined,
  label: string = DEFAULT_MOUNTING_INSTRUCTIONS_LABEL
): string {
  const url = (mountingUrl ?? "").trim();
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

type LinkShapePatchOpts = {
  relId: string;
  url?: string;
  markers: string[];
};

function normalizeMarker(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\{\}\s"'`]/g, "")
    .replace(/_/g, "");
}

function patchShapeHyperlink(cNvPrTag: string, relId: string, url: string): string {
  const tooltip = escapeXmlAttr(url);
  const hlink = `<a:hlinkClick r:id="${relId}" tooltip="${tooltip}"/>`;

  if (cNvPrTag.endsWith("/>")) {
    return cNvPrTag.replace("/>", `>${hlink}</p:cNvPr>`);
  }

  if (cNvPrTag.includes("<a:hlinkClick")) {
    return cNvPrTag
      .replace(/<a:hlinkClick\b[^>]*>/, `<a:hlinkClick r:id="${relId}" tooltip="${tooltip}">`)
      .replace(/<a:hlinkClick\b([^>]*)\/>/, `<a:hlinkClick r:id="${relId}" tooltip="${tooltip}"/>`);
  }

  return cNvPrTag.replace("</p:cNvPr>", `${hlink}</p:cNvPr>`);
}

/**
 * מזהה צורה לפי alt text (descr/name/title) ומחיל קישור ברמת shape.
 * אם אין URL — הצורה נמחקת מהשקופית.
 */
export function patchLinkShapeByAltText(
  xml: string,
  opts: LinkShapePatchOpts
): string {
  const normalizedMarkers = opts.markers.map(normalizeMarker).filter(Boolean);
  if (!normalizedMarkers.length) return xml;
  const url = (opts.url ?? "").trim();

  const tags = ["sp", "pic", "graphicFrame", "cxnSp", "grpSp"];
  const ranges: Array<{ start: number; end: number; replacement: string }> = [];

  for (const tag of tags) {
    const re = new RegExp(`<p:${tag}\\b[\\s\\S]*?<\\/p:${tag}>`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) {
      const block = m[0];
      const cNvPr = block.match(/<p:cNvPr\b[\s\S]*?(?:\/>|<\/p:cNvPr>)/);
      if (!cNvPr) continue;

      const attrs = cNvPr[0].match(/<(?:p:)?cNvPr\b([^>]*)>/)?.[1] ?? "";
      const desc = attrs.match(/\bdescr="([^"]*)"/)?.[1] ?? "";
      const name = attrs.match(/\bname="([^"]*)"/)?.[1] ?? "";
      const title = attrs.match(/\btitle="([^"]*)"/)?.[1] ?? "";
      const hay = normalizeMarker(`${desc} ${name} ${title}`);

      if (!normalizedMarkers.some((marker) => hay.includes(marker))) continue;

      if (!url) {
        ranges.push({ start: m.index, end: m.index + block.length, replacement: "" });
        continue;
      }

      const patchedCNvPr = patchShapeHyperlink(cNvPr[0], opts.relId, url);
      const replacement = block.replace(cNvPr[0], patchedCNvPr);
      ranges.push({ start: m.index, end: m.index + block.length, replacement });
    }
  }

  if (!ranges.length) return xml;

  ranges.sort((a, b) => b.start - a.start);
  let out = xml;
  for (const r of ranges) {
    out = out.slice(0, r.start) + r.replacement + out.slice(r.end);
  }
  return out;
}

function escapeXmlAttr(value: string): string {
  return escapeXmlText(value).replace(/'/g, "&apos;");
}
