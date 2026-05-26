import {
  clearCatalogTemplateOverride,
  getCatalogTemplateMeta,
  getCatalogTemplateOverride,
  saveCatalogTemplateOverride,
  validateCatalogTemplate,
  type CatalogTemplateMeta,
} from "@/lib/catalogTemplateStorage";

export const DEFAULT_CATALOG_TEMPLATE_PATH = "/catalog-template.pptx";
export const DEFAULT_CATALOG_TEMPLATE_FILENAME = "catalog-template.pptx";

export async function loadCatalogTemplateBuffer(): Promise<ArrayBuffer> {
  const override = await getCatalogTemplateOverride();
  if (override) return override;

  const res = await fetch(DEFAULT_CATALOG_TEMPLATE_PATH);
  if (!res.ok) {
    throw new Error(
      "לא נמצאה תבנית מצגת (catalog-template.pptx). הרץ pack-catalog-template או העלה תבנית בהגדרות."
    );
  }
  return res.arrayBuffer();
}

export async function getActiveCatalogTemplateMeta(): Promise<{
  source: "override" | "default";
  meta: CatalogTemplateMeta | null;
}> {
  const meta = await getCatalogTemplateMeta();
  if (meta) return { source: "override", meta };
  return { source: "default", meta: null };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCatalogTemplate(): Promise<void> {
  const buffer = await loadCatalogTemplateBuffer();
  const { source, meta } = await getActiveCatalogTemplateMeta();
  const filename =
    source === "override" && meta?.filename
      ? meta.filename
      : DEFAULT_CATALOG_TEMPLATE_FILENAME;

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    filename
  );
}

export async function uploadCatalogTemplate(file: File): Promise<CatalogTemplateMeta> {
  const buffer = await file.arrayBuffer();
  const valid = await validateCatalogTemplate(buffer);
  if (!valid.ok) throw new Error(valid.error);

  await saveCatalogTemplateOverride(buffer, file.name);
  const meta = await getCatalogTemplateMeta();
  if (!meta) throw new Error("שמירת התבנית נכשלה");
  return meta;
}

export { clearCatalogTemplateOverride, getCatalogTemplateMeta, validateCatalogTemplate };
