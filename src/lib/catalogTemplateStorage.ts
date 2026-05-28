import JSZip from "jszip";
import { supabase } from "@/lib/supabase";
import {
  CATALOG_TEMPLATE_KINDS,
  type CatalogTemplateKind,
} from "@/lib/catalogTemplateTypes";
import { countSlideImageSlots } from "@/lib/pptxExportUtils";

const TEMPLATE_BUCKET = process.env.NEXT_PUBLIC_CATALOG_TEMPLATE_BUCKET ?? "catalog-templates";
const TEMPLATE_PREFIX = "shared";
const TEMPLATE_STATE_PATH = `${TEMPLATE_PREFIX}/catalog-templates-v2-state.json`;

/** מצב ישן — תאימות לאחור */
const LEGACY_STATE_PATH = `${TEMPLATE_PREFIX}/catalog-template-state.json`;

export type CatalogTemplateMeta = {
  filename: string;
  uploadedAt: number;
  size: number;
};

type TemplateEntry = {
  path: string;
  meta: CatalogTemplateMeta;
};

export type CatalogTemplatesState = Partial<Record<CatalogTemplateKind, TemplateEntry>>;

function toStorageErrorMessage(prefix: string, error: unknown): string {
  if (error instanceof Error && error.message) return `${prefix}: ${error.message}`;
  return prefix;
}

async function readJsonState(path: string): Promise<unknown | null> {
  const { data, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(path);
  if (error) {
    const code = (error as { statusCode?: string | number }).statusCode;
    if (code === "404" || code === 404 || code === "400" || code === 400) return null;
    throw new Error(toStorageErrorMessage("קריאת מצב התבנית נכשלה", error));
  }
  const raw = await data.text();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("מצב תבנית לא תקין בשרת");
  }
}

async function readTemplatesState(): Promise<CatalogTemplatesState> {
  const v2 = await readJsonState(TEMPLATE_STATE_PATH);
  if (v2 && typeof v2 === "object" && !Array.isArray(v2)) {
    return v2 as CatalogTemplatesState;
  }
  return {};
}

async function writeTemplatesState(state: CatalogTemplatesState): Promise<void> {
  const payload = new Blob([JSON.stringify(state)], { type: "application/json" });
  const { error } = await supabase.storage.from(TEMPLATE_BUCKET).upload(TEMPLATE_STATE_PATH, payload, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) {
    throw new Error(toStorageErrorMessage("שמירת מצב תבנית נכשלה", error));
  }
}

async function removePaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(TEMPLATE_BUCKET).remove(paths);
  if (error) {
    throw new Error(toStorageErrorMessage("מחיקת תבנית נכשלה", error));
  }
}

async function validatePptxZip(buffer: ArrayBuffer): Promise<{ ok: true; zip: JSZip } | { ok: false; error: string }> {
  if (buffer.byteLength < 1024) {
    return { ok: false, error: "הקובץ קטן מדי" };
  }
  if (buffer.byteLength > 25 * 1024 * 1024) {
    return { ok: false, error: "הקובץ גדול מ-25MB" };
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { ok: false, error: "קובץ PPTX לא תקין" };
  }
  return { ok: true, zip };
}

export async function validateCatalogTemplateByKind(
  kind: CatalogTemplateKind,
  buffer: ArrayBuffer
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = await validatePptxZip(buffer);
  if (!parsed.ok) return parsed;

  const { zip } = parsed;
  const slidePath = "ppt/slides/slide1.xml";
  const relsPath = "ppt/slides/_rels/slide1.xml.rels";

  if (!zip.file(slidePath)) {
    return { ok: false, error: `חסר ${slidePath} — כל תבנית חייבת להכיל שקופית אחת (slide1)` };
  }
  if (!zip.file(relsPath)) {
    return { ok: false, error: `חסר ${relsPath}` };
  }

  const slide1 = await zip.file(slidePath)!.async("string");

  if (kind === "cover") {
    if (
      !slide1.includes("{{שם_פרויקט}}") &&
      !slide1.includes("{{מהדורה}}") &&
      !slide1.includes("{{projectName}}")
    ) {
      return {
        ok: false,
        error: "תבנית שער: הוסף {{שם_פרויקט}} או {{מהדורה}} בשקופית",
      };
    }
    return { ok: true };
  }

  if (!slide1.includes("{{סימון}}") && !slide1.includes("{{שם_מוצר}}")) {
    return {
      ok: false,
      error: "תבנית קטלוג: הוסף {{סימון}} או {{שם_מוצר}} בשקופית",
    };
  }

  const rels = await zip.file(relsPath)!.async("string");
  const imageSlotCount = countSlideImageSlots(rels, slide1);

  const slotError = (required: number, label: string) =>
    `${label}: נדרשים לפחות ${required} מקומות תמונה בשקופית (נמצאו ${imageSlotCount}). ` +
    `מומלץ: קבצי מדיה בשם image1, image2… או 3/2/1 תמונות מוטמעות בשקופית.`;

  if (kind === "single" && imageSlotCount < 1) {
    return { ok: false, error: slotError(1, "תבנית תמונה אחת") };
  }
  if (kind === "two" && imageSlotCount < 2) {
    return { ok: false, error: slotError(2, "תבנית 2 תמונות") };
  }

  if (kind === "three") {
    if (!zip.file("ppt/slides/slide2.xml") || !zip.file("ppt/slides/_rels/slide2.xml.rels")) {
      return {
        ok: false,
        error:
          "תבנית 3 תמונות: נדרשים 2 שקפים בקובץ אחד — slide1 (תמונה אחת) ו-slide2 (2 תמונות)",
      };
    }
    const slide2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
    const rels2 = await zip.file("ppt/slides/_rels/slide2.xml.rels")!.async("string");
    const slots1 = countSlideImageSlots(rels, slide1);
    const slots2 = countSlideImageSlots(rels2, slide2);
    if (slots1 < 1) {
      return { ok: false, error: "תבנית 3 תמונות: slide1 צריך מקום לתמונה אחת" };
    }
    if (slots2 < 2) {
      return {
        ok: false,
        error:
          `תבנית 3 תמונות: slide2 צריך 2 מקומות תמונה (נמצאו ${slots2}). ` +
          `הוסף תמונה שנייה ב-slide2 (הכנס → תמונות), לא העתק של אותה תמונה.`,
      };
    }
  }

  return { ok: true };
}

export async function getCatalogTemplateOverride(
  kind: CatalogTemplateKind
): Promise<ArrayBuffer | null> {
  const state = await readTemplatesState();
  const entry = state[kind];
  if (!entry?.path) return null;

  const { data, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(entry.path);
  if (error) {
    const code = (error as { statusCode?: string | number }).statusCode;
    if (code === "404" || code === 404 || code === "400" || code === 400) return null;
    throw new Error(toStorageErrorMessage("טעינת תבנית מהשרת נכשלה", error));
  }
  return data.arrayBuffer();
}

export async function getCatalogTemplatesMeta(): Promise<
  Partial<Record<CatalogTemplateKind, CatalogTemplateMeta>>
> {
  const state = await readTemplatesState();
  const meta: Partial<Record<CatalogTemplateKind, CatalogTemplateMeta>> = {};
  for (const kind of CATALOG_TEMPLATE_KINDS) {
    if (state[kind]?.meta) meta[kind] = state[kind]!.meta;
  }
  return meta;
}

export async function saveCatalogTemplateOverride(
  kind: CatalogTemplateKind,
  buffer: ArrayBuffer,
  filename: string
): Promise<CatalogTemplateMeta> {
  const valid = await validateCatalogTemplateByKind(kind, buffer);
  if (!valid.ok) throw new Error(valid.error);

  const state = await readTemplatesState();
  const previous = state[kind];
  const uploadedAt = Date.now();
  const safeName = (filename || `${kind}-template.pptx`).trim().replace(/[^\w.\-]+/g, "_");
  const versionedPath = `${TEMPLATE_PREFIX}/${kind}-template-${uploadedAt}-${safeName}`;
  const file = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const { error } = await supabase.storage.from(TEMPLATE_BUCKET).upload(versionedPath, file, {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    upsert: false,
  });
  if (error) {
    throw new Error(toStorageErrorMessage("העלאת תבנית לשרת נכשלה", error));
  }

  const meta: CatalogTemplateMeta = {
    filename: filename || `${kind}-template.pptx`,
    uploadedAt,
    size: buffer.byteLength,
  };

  state[kind] = { path: versionedPath, meta };
  await writeTemplatesState(state);

  if (previous?.path && previous.path !== versionedPath) {
    await removePaths([previous.path]);
  }

  return meta;
}

export async function clearCatalogTemplateOverride(kind?: CatalogTemplateKind): Promise<void> {
  const state = await readTemplatesState();
  const pathsToRemove: string[] = [];

  if (kind) {
    if (state[kind]?.path) pathsToRemove.push(state[kind]!.path);
    delete state[kind];
    await writeTemplatesState(state);
    if (pathsToRemove.length) await removePaths(pathsToRemove);
    return;
  }

  for (const k of CATALOG_TEMPLATE_KINDS) {
    if (state[k]?.path) pathsToRemove.push(state[k]!.path);
  }
  await removePaths([TEMPLATE_STATE_PATH, LEGACY_STATE_PATH, ...pathsToRemove]);
}

/** @deprecated — ולידציה של קובץ משולב ישן */
export async function validateCatalogTemplate(
  buffer: ArrayBuffer
): Promise<{ ok: true } | { ok: false; error: string }> {
  return validateCatalogTemplateByKind("single", buffer);
}

/** @deprecated */
export async function getCatalogTemplateMeta(): Promise<CatalogTemplateMeta | null> {
  const metas = await getCatalogTemplatesMeta();
  return metas.single ?? null;
}

export function formatTemplateSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
