import { toast } from "sonner";
import type { Project } from "@/types";
import {
  buildAccessorySlideContext,
  buildItemSlideContext,
  type CoverSlideContext,
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

export async function exportProjectToPresentation(project: Project): Promise<void> {
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

  const now = new Date();
  const months = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  const coverCtx: CoverSlideContext = {
    projectName: project.name,
    floorName: "",
    editionLine: `מהדורה 1 ${months[now.getMonth()]}`,
    year: String(now.getFullYear()),
  };

  const { blob, imageWarnings } = await buildCatalogPresentationBlob({ coverCtx, catalogSlides });
  const filename = `${sanitizeFilename(project.name)}-קטלוג.pptx`;
  triggerPresentationDownload(blob, filename);
  if (imageWarnings.length > 0) {
    toast.warning(
      `${imageWarnings.length} תמונות לא נטענו — ייתכן מסגרת ריקה במצגת. בדוק את הקישורים בפריט.`
    );
  }
}
