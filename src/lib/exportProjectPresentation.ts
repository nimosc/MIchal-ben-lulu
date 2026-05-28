import { toast } from "sonner";
import type { Project } from "@/types";
import {
  buildAccessorySlideContext,
  buildItemSlideContext,
  type CoverSlideContext,
} from "@/lib/catalogSlideFill";
import { buildPresentationPreviewSlides } from "@/lib/catalogPresentationPreview";
import type { CatalogPresentationPreviewState } from "@/lib/catalogPresentationPreview";
import { planCatalogSlides } from "@/lib/catalogTemplateTypes";
import {
  buildCatalogPresentationBlob,
  triggerPresentationDownload,
  type CatalogOutputSlide,
} from "@/lib/exportPresentationBuilder";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

function buildProjectCoverContext(project: Project): CoverSlideContext {
  const now = new Date();
  const months = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  return {
    projectName: project.name,
    floorName: "",
    editionLine: `מהדורה 1 ${months[now.getMonth()]}`,
    year: String(now.getFullYear()),
  };
}

function collectProjectCatalogSlides(project: Project): CatalogOutputSlide[] {
  const sortedFloors = [...project.floors].sort((a, b) => a.order - b.order);
  const catalogSlides: CatalogOutputSlide[] = [];
  for (const floor of sortedFloors) {
    for (const item of floor.items) {
      const ctx = buildItemSlideContext(project, floor, item);
      for (const plan of planCatalogSlides(ctx.imageUrls)) {
        catalogSlides.push({ ctx, plan });
      }
      for (let accIdx = 0; accIdx < item.accessories.length; accIdx++) {
        const acc = item.accessories[accIdx];
        const accCtx = buildAccessorySlideContext(project, floor, item, acc, accIdx);
        for (const plan of planCatalogSlides(accCtx.imageUrls)) {
          catalogSlides.push({ ctx: accCtx, plan });
        }
      }
    }
  }
  return catalogSlides;
}

export async function prepareProjectPresentation(
  project: Project
): Promise<CatalogPresentationPreviewState> {
  const coverCtx = buildProjectCoverContext(project);
  const catalogSlides = collectProjectCatalogSlides(project);
  const { blob, imageWarnings } = await buildCatalogPresentationBlob({ coverCtx, catalogSlides });
  const filename = `${sanitizeFilename(project.name)}-קטלוג.pptx`;
  const slides = buildPresentationPreviewSlides(coverCtx, catalogSlides);
  return { blob, filename, slides, imageWarnings };
}

export async function exportProjectToPresentation(project: Project): Promise<void> {
  const result = await prepareProjectPresentation(project);
  triggerPresentationDownload(result.blob, result.filename);
  if (result.imageWarnings.length > 0) {
    toast.warning(
      `${result.imageWarnings.length} תמונות לא נטענו — ייתכן מסגרת ריקה במצגת. בדוק את הקישורים בפריט.`
    );
  }
}
