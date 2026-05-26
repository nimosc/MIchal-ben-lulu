import JSZip from "jszip";

const DB_NAME = "lighting-app";
const DB_VERSION = 1;
const STORE = "blobs";
const TEMPLATE_KEY = "catalog-template-override";

export type CatalogTemplateMeta = {
  filename: string;
  uploadedAt: number;
  size: number;
};

type StoredTemplate = {
  buffer: ArrayBuffer;
  meta: CatalogTemplateMeta;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
}

const REQUIRED_PATHS = [
  "ppt/slides/slide1.xml",
  "ppt/slides/slide2.xml",
  "ppt/slides/_rels/slide2.xml.rels",
] as const;

export async function validateCatalogTemplate(
  buffer: ArrayBuffer
): Promise<{ ok: true } | { ok: false; error: string }> {
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

  for (const path of REQUIRED_PATHS) {
    if (!zip.file(path)) {
      return {
        ok: false,
        error: `חסר בקובץ: ${path} (נדרשות שקופית שער + שקופית קטלוג)`,
      };
    }
  }

  const slide2 = await zip.file("ppt/slides/slide2.xml")!.async("string");
  if (!slide2.includes("{{mark}}") && !slide2.includes("{{productTitle}}")) {
    return {
      ok: false,
      error: "התבנית לא משתמשת ב-{{משתנה}} — הורידו תבנית מעודכנת מההגדרות",
    };
  }
  if (!slide2.includes("{{productUrl}}") && !slide2.includes('name="TextBox 13"')) {
    return {
      ok: false,
      error: "חסר {{productUrl}} או TextBox 13 לקישור מוצר",
    };
  }
  if (
    !slide2.includes("{{mountingInstructionsLabel}}") &&
    !slide2.includes("קישור לדף הוראות התקנת גוף תאורה")
  ) {
    return {
      ok: false,
      error: "חסר {{mountingInstructionsLabel}} לקישור הוראות התקנה",
    };
  }

  return { ok: true };
}

export async function getCatalogTemplateOverride(): Promise<ArrayBuffer | null> {
  const stored = await idbGet<StoredTemplate>(TEMPLATE_KEY);
  return stored?.buffer ?? null;
}

export async function getCatalogTemplateMeta(): Promise<CatalogTemplateMeta | null> {
  const stored = await idbGet<StoredTemplate>(TEMPLATE_KEY);
  return stored?.meta ?? null;
}

export async function saveCatalogTemplateOverride(
  buffer: ArrayBuffer,
  filename: string
): Promise<void> {
  const valid = await validateCatalogTemplate(buffer);
  if (!valid.ok) throw new Error(valid.error);

  await idbSet(TEMPLATE_KEY, {
    buffer,
    meta: {
      filename: filename || "catalog-template.pptx",
      uploadedAt: Date.now(),
      size: buffer.byteLength,
    },
  } satisfies StoredTemplate);
}

export async function clearCatalogTemplateOverride(): Promise<void> {
  await idbDelete(TEMPLATE_KEY);
}

export function formatTemplateSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
