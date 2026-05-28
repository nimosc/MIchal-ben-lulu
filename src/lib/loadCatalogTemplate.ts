import {
  clearCatalogTemplateOverride,
  getCatalogTemplateOverride,
  getCatalogTemplatesMeta,
  saveCatalogTemplateOverride,
  validateCatalogTemplateByKind,
  type CatalogTemplateMeta,
} from "@/lib/catalogTemplateStorage";
import {
  CATALOG_TEMPLATE_CONFIG,
  CATALOG_TEMPLATE_KINDS,
  type CatalogTemplateKind,
} from "@/lib/catalogTemplateTypes";

export type { CatalogTemplateKind, CatalogTemplateMeta };

export async function loadCatalogTemplateBuffer(kind: CatalogTemplateKind): Promise<ArrayBuffer> {
  const override = await getCatalogTemplateOverride(kind);
  if (override) return override;

  const { defaultPath } = CATALOG_TEMPLATE_CONFIG[kind];
  const res = await fetch(defaultPath);
  if (!res.ok) {
    throw new Error(
      `לא נמצאה תבנית ${CATALOG_TEMPLATE_CONFIG[kind].label} (${CATALOG_TEMPLATE_CONFIG[kind].defaultFilename}). העלה קובץ בהגדרות.`
    );
  }
  return res.arrayBuffer();
}

export async function loadAllCatalogTemplates(): Promise<
  Record<CatalogTemplateKind, ArrayBuffer>
> {
  const entries = await Promise.all(
    CATALOG_TEMPLATE_KINDS.map(async (kind) => [kind, await loadCatalogTemplateBuffer(kind)] as const)
  );
  return Object.fromEntries(entries) as Record<CatalogTemplateKind, ArrayBuffer>;
}

export async function getActiveCatalogTemplatesMeta(): Promise<{
  sources: Partial<Record<CatalogTemplateKind, "override" | "default">>;
  metas: Partial<Record<CatalogTemplateKind, CatalogTemplateMeta>>;
}> {
  const metas = await getCatalogTemplatesMeta();
  const sources: Partial<Record<CatalogTemplateKind, "override" | "default">> = {};
  for (const kind of CATALOG_TEMPLATE_KINDS) {
    sources[kind] = metas[kind] ? "override" : "default";
  }
  return { sources, metas };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadCatalogTemplate(kind: CatalogTemplateKind): Promise<void> {
  const buffer = await loadCatalogTemplateBuffer(kind);
  const { metas } = await getActiveCatalogTemplatesMeta();
  const filename =
    metas[kind]?.filename ?? CATALOG_TEMPLATE_CONFIG[kind].defaultFilename;

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    filename
  );
}

export async function uploadCatalogTemplate(
  kind: CatalogTemplateKind,
  file: File
): Promise<CatalogTemplateMeta> {
  const buffer = await file.arrayBuffer();
  const valid = await validateCatalogTemplateByKind(kind, buffer);
  if (!valid.ok) throw new Error(valid.error);

  return saveCatalogTemplateOverride(kind, buffer, file.name);
}

export {
  clearCatalogTemplateOverride,
  getCatalogTemplatesMeta,
  validateCatalogTemplateByKind,
};
