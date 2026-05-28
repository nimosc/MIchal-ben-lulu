import { toast } from "sonner";
import type { Floor, Project } from "@/types";
import {
  buildAccessorySlideContext,
  buildCoverSlideContext,
  buildItemSlideContext,
} from "@/lib/catalogSlideFill";
import { planCatalogSlides } from "@/lib/catalogTemplateTypes";
import {
  buildCatalogPresentationBlob,
  triggerPresentationDownload,
  type CatalogOutputSlide,
} from "@/lib/exportPresentationBuilder";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

function compareMarkAsc(a: string, b: string): number {
  return a.trim().localeCompare(b.trim(), "en", {
    sensitivity: "base",
    numeric: true,
  });
}

function collectCatalogSlides(project: Project, floor: Floor): CatalogOutputSlide[] {
  const slides: CatalogOutputSlide[] = [];
  const sortedItems = [...floor.items].sort((a, b) => compareMarkAsc(a.mark ?? "", b.mark ?? ""));
  for (const item of sortedItems) {
    const ctx = buildItemSlideContext(project, floor, item);
    for (const plan of planCatalogSlides(ctx.imageUrls)) {
      slides.push({ ctx, plan });
    }
    item.accessories.forEach((acc, idx) => {
      const accCtx = buildAccessorySlideContext(project, floor, item, acc, idx);
      for (const plan of planCatalogSlides(accCtx.imageUrls)) {
        slides.push({ ctx: accCtx, plan });
      }
    });
  }
  return slides;
}

export async function exportFloorToPresentation(
  project: Project,
  floor: Floor
): Promise<void> {
  const coverCtx = buildCoverSlideContext(project, floor);
  const catalogSlides = collectCatalogSlides(project, floor);
  const { blob, imageWarnings } = await buildCatalogPresentationBlob({ coverCtx, catalogSlides });
  const filename = `${sanitizeFilename(project.name)}-${sanitizeFilename(floor.name)}-קטלוג.pptx`;
  triggerPresentationDownload(blob, filename);
  if (imageWarnings.length > 0) {
    toast.warning(
      `${imageWarnings.length} תמונות לא נטענו — ייתכן מסגרת ריקה במצגת. בדוק את הקישורים בפריט.`
    );
  }
}
