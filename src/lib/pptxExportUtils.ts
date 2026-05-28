/** Shared PPTX export helpers (catalog slides) */

const SLIDE_IMAGE_REL_RE =
  /(<Relationship[^>]*Type="[^"]*relationships\/image"[^>]*Target="\.\.\/media\/)([^"]+)("[^>]*\/>)/g;

/** image1.png / image2.jpeg וכו' — לא חייב להתחיל מ-1 */
const PLACEHOLDER_IMAGE_NAME = /^image\d+\./i;
const SKIP_IMAGE_NAME = /logo|icon|watermark|emblem/i;
const EXPORTED_MEDIA_NAME = /^catalog-/i;

/** כמה מקומות תמונה יש בשקופית (לולידציית תבנית) */
export function countSlideImageSlots(rels: string, slideXml?: string): number {
  const blipCount = slideXml
    ? [...slideXml.matchAll(/<a:blip[^>]*r:embed="/gi)].length
    : 0;

  const targetRe = /Type="[^"]*relationships\/image"[^>]*Target="\.\.\/media\/([^"]+)"/gi;
  const targets = [...rels.matchAll(targetRe)].map((m) => m[1]);
  const placeholders = targets.filter((t) => PLACEHOLDER_IMAGE_NAME.test(t));
  const fromRels = placeholders.length > 0
    ? placeholders.length
    : targets.filter((t) => !SKIP_IMAGE_NAME.test(t)).length || targets.length;

  // שתי מסגרות תמונה יכולות לשתף אותו קובץ ב-rels — סופרים לפי blip בשקופית
  return Math.max(blipCount, fromRels);
}

function collectUsedRIds(relsXml: string): Set<number> {
  const used = new Set<number>();
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) {
    used.add(parseInt(m[1], 10));
  }
  return used;
}

function allocateRId(used: Set<number>): string {
  let candidate = 1;
  while (used.has(candidate)) candidate += 1;
  used.add(candidate);
  return `rId${candidate}`;
}

const IMAGE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

type BlipSlot = { blipIndex: number; rid: string; cx: number; cy: number; x: number; y: number };

/** מסגרות תמונה בשקופית — מיקום (x,y), גודל (cx,cy), סדר מסגרת */
function extractBlipSlots(slideXml: string): BlipSlot[] {
  const slots: BlipSlot[] = [];
  const spRe = /<p:sp>[\s\S]*?<\/p:sp>/gi;
  let blipIndex = 0;
  for (const sp of slideXml.match(spRe) || []) {
    const embed = sp.match(/<a:blip\b[^>]*\br:embed="(rId\d+)"/i);
    if (!embed) continue;
    const off = sp.match(/<a:off x="(\d+)" y="(\d+)"/);
    const ext = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    slots.push({
      blipIndex: blipIndex++,
      rid: embed[1],
      cx: parseInt(ext?.[1] ?? "0", 10),
      cy: parseInt(ext?.[2] ?? "0", 10),
      x: parseInt(off?.[1] ?? "0", 10),
      y: parseInt(off?.[2] ?? "0", 10),
    });
  }
  if (slots.length > 0) return slots;

  const blips = [...slideXml.matchAll(/<a:blip\b[^>]*\br:embed="(rId\d+)"/gi)];
  return blips.map((m, i) => ({ blipIndex: i, rid: m[1], cx: 0, cy: 0, x: 0, y: 0 }));
}

/** בוחר מסגרות פעילות: 1 תמונה → הגדולה; 2+ → מסגרות ראשיות (לא תמונת ממוזערת) */
function pickActiveBlipSlots(slots: BlipSlot[], mediaCount: number): { active: BlipSlot[]; inactive: BlipSlot[] } {
  if (mediaCount <= 0) return { active: [], inactive: slots };
  if (mediaCount === 1) {
    const ranked = [...slots].sort(
      (a, b) => b.cx * b.cy - a.cx * a.cy || b.cx - a.cx || a.blipIndex - b.blipIndex
    );
    return { active: [ranked[0]], inactive: ranked.slice(1) };
  }

  const maxCx = Math.max(...slots.map((s) => s.cx), 1);
  const major = slots.filter((s) => s.cx >= maxCx * 0.55);
  const pool = major.length >= mediaCount ? major : slots;
  const ranked = [...pool].sort((a, b) => a.y - b.y || a.x - b.x || a.blipIndex - b.blipIndex);
  const active = ranked.slice(0, mediaCount);
  const activeIdx = new Set(active.map((s) => s.blipIndex));
  const inactive = slots.filter((s) => !activeIdx.has(s.blipIndex));
  return { active, inactive };
}

function removeBlipShapeAt(slideXml: string, blipIndex: number): string {
  const spRe = /<p:sp>[\s\S]*?<\/p:sp>/gi;
  let idx = 0;
  return slideXml.replace(spRe, (sp) => {
    if (!sp.includes("<a:blip")) return sp;
    if (idx++ !== blipIndex) return sp;
    return "";
  });
}

function replaceBlipEmbedAt(slideXml: string, blipIndex: number, newRid: string): string {
  const re = /<a:blip\b[^>]*\br:embed="(rId\d+)"/gi;
  let idx = 0;
  return slideXml.replace(re, (full, rid) => {
    if (idx++ !== blipIndex) return full;
    return full.replace(`r:embed="${rid}"`, `r:embed="${newRid}"`);
  });
}

function setImageRelTarget(rels: string, rid: string, file: string): string {
  const pattern = new RegExp(
    `(<Relationship Id="${rid}"[^>]*Type="[^"]*relationships/image"[^>]*Target=")[^"]+(")`
  );
  if (pattern.test(rels)) {
    return rels.replace(pattern, `$1../media/${file}$2`);
  }
  const rel = `<Relationship Id="${rid}" Type="${IMAGE_REL_TYPE}" Target="../media/${file}"/>`;
  return rels.replace("</Relationships>", `${rel}</Relationships>`);
}

/** מפריד rId משותף לכל blip לפני שיבוץ קבצים (תבנית Google: 2 מסגרות → rId3 אחד) */
function ensureUniqueRidPerBlip(
  slideXml: string,
  slots: BlipSlot[],
  used: Set<number>
): { slideXml: string; ridByBlip: Map<number, string> } {
  let outXml = slideXml;
  const ridByBlip = new Map<number, string>();
  const seen = new Set<string>();

  for (const slot of slots) {
    let rid = slot.rid;
    if (seen.has(rid)) {
      rid = allocateRId(used);
      outXml = replaceBlipEmbedAt(outXml, slot.blipIndex, rid);
    }
    seen.add(rid);
    ridByBlip.set(slot.blipIndex, rid);
  }

  return { slideXml: outXml, ridByBlip };
}

/**
 * מצמיד תמונות לשקופית.
 * תבנית "3 תמונות": slide1 — נשארת מסגרת גדולה בלבד; slide2 — מפצלים rId משותף.
 */
export function applySlideMediaFiles(
  slideXml: string,
  rels: string,
  mediaFiles: string[]
): { slideXml: string; rels: string } {
  if (!mediaFiles.length) return { slideXml, rels };

  const slots = extractBlipSlots(slideXml);
  if (!slots.length) {
    return {
      slideXml,
      rels: updateSlideRelsWithMediaFiles(stripNotesSlideRel(rels), { mediaFiles }),
    };
  }

  const { active, inactive } = pickActiveBlipSlots(slots, mediaFiles.length);

  let outXml = slideXml;
  let outRels = stripNotesSlideRel(rels);
  const used = collectUsedRIds(outRels);

  const { slideXml: splitXml, ridByBlip } = ensureUniqueRidPerBlip(outXml, active, used);
  outXml = splitXml;

  const assignOrder = [...active].sort((a, b) => a.blipIndex - b.blipIndex);
  for (let i = 0; i < mediaFiles.length; i++) {
    const slot = assignOrder[i];
    const rid = ridByBlip.get(slot.blipIndex)!;
    outRels = setImageRelTarget(outRels, rid, mediaFiles[i]);
  }

  const removeOrder = [...inactive].sort((a, b) => b.blipIndex - a.blipIndex);
  for (const slot of removeOrder) {
    outXml = removeBlipShapeAt(outXml, slot.blipIndex);
  }

  return { slideXml: outXml, rels: outRels };
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** כל שקופית קטלוג מצביעה על notesSlide2 — PowerPoint מתקן/מתריע */
export function stripNotesSlideRel(rels: string): string {
  return rels.replace(
    /<Relationship[^>]*relationships\/notesSlide[^>]*\/>/g,
    ""
  );
}

export function updateSlideRels(
  rels: string,
  opts: { productUrl?: string; mountingUrl?: string; mediaFile?: string | null }
): string {
  const mediaFiles = opts.mediaFile ? [opts.mediaFile] : [];
  return updateSlideRelsWithMediaFiles(rels, {
    productUrl: opts.productUrl,
    mountingUrl: opts.mountingUrl,
    mediaFiles,
  });
}

export function updateSlideRelsWithMediaFiles(
  rels: string,
  opts: { productUrl?: string; mountingUrl?: string; mediaFiles?: string[] }
): string {
  let out = stripNotesSlideRel(rels);
  if (opts.productUrl?.trim()) {
    out = out.replace(
      /(<Relationship Id="rId5" Type="[^"]*hyperlink"[^>]*Target=")[^"]+(")/,
      `$1${escapeXmlAttr(opts.productUrl.trim())}$2`
    );
  }
  if (opts.mountingUrl?.trim()) {
    const target = escapeXmlAttr(opts.mountingUrl.trim());
    const rel = `<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${target}" TargetMode="External"/>`;
    if (out.includes('Id="rId6"')) {
      out = out.replace(/<Relationship Id="rId6"[^/]*\/>/, rel);
    } else {
      out = out.replace("</Relationships>", `${rel}</Relationships>`);
    }
  }
  const mediaFiles = opts.mediaFiles ?? [];
  if (mediaFiles.length > 0) {
    let mediaIndex = 0;
    // מעבר 1: image1 / image2 / image3 (כל סיומת)
    out = out.replace(SLIDE_IMAGE_REL_RE, (full, prefix, targetName, suffix) => {
      if (EXPORTED_MEDIA_NAME.test(targetName)) return full;
      if (!PLACEHOLDER_IMAGE_NAME.test(targetName)) return full;
      const nextFile = mediaFiles[mediaIndex];
      mediaIndex += 1;
      if (!nextFile) return full;
      return `${prefix}${nextFile}${suffix}`;
    });
    // מעבר 2: שאר קשרי תמונה (תבניות בלי שמות imageN) — מדלגים לוגו
    if (mediaIndex < mediaFiles.length) {
      out = out.replace(SLIDE_IMAGE_REL_RE, (full, prefix, targetName, suffix) => {
        if (EXPORTED_MEDIA_NAME.test(targetName)) return full;
        if (PLACEHOLDER_IMAGE_NAME.test(targetName)) return full;
        if (SKIP_IMAGE_NAME.test(targetName)) return full;
        const nextFile = mediaFiles[mediaIndex];
        mediaIndex += 1;
        if (!nextFile) return full;
        return `${prefix}${nextFile}${suffix}`;
      });
    }
  }
  return out;
}

export function mediaExtensionFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  return "png";
}

export function mediaContentTypeForFile(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

/** PowerPoint לא תמיד מציג webp/svg בתוך pptx */
async function toPptxSafeImage(
  data: Uint8Array,
  ext: string
): Promise<{ data: Uint8Array; ext: string }> {
  const normalized = ext.toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg" || normalized === "png") {
    return { data, ext: normalized === "jpeg" ? "jpg" : normalized };
  }
  if (typeof document === "undefined") return { data, ext: "png" };

  try {
    const mime =
      normalized === "webp"
        ? "image/webp"
        : normalized === "svg"
          ? "image/svg+xml"
          : `image/${normalized}`;
    const blob = new Blob([data], { type: mime });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { data, ext: "png" };
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!pngBlob) return { data, ext: "png" };
    return { data: new Uint8Array(await pngBlob.arrayBuffer()), ext: "png" };
  } catch {
    return { data, ext: "png" };
  }
}

export async function fetchCatalogImageBytes(
  url: string
): Promise<{ data: Uint8Array; ext: string } | null> {
  const tryFetch = async (): Promise<{ data: Uint8Array; ext: string } | null> => {
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/html") || ct.includes("application/json")) return null;
    const ext = mediaExtensionFromContentType(ct);
    const raw = new Uint8Array(await res.arrayBuffer());
    if (raw.byteLength < 32) return null;
    return toPptxSafeImage(raw, ext);
  };

  try {
    const first = await tryFetch();
    if (first?.data.byteLength) return first;
    return await tryFetch();
  } catch {
    return null;
  }
}
