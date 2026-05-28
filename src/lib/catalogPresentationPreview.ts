import type { CatalogSlideContext, CoverSlideContext } from "@/lib/catalogSlideFill";
import type { CatalogOutputSlide } from "@/lib/exportPresentationBuilder";

export type CatalogPresentationPreviewState = {
  slides: PresentationPreviewSlide[];
  blob: Blob;
  filename: string;
  imageWarnings: string[];
};

export type PresentationPreviewSlide =
  | {
      kind: "cover";
      projectName: string;
      floorName: string;
      editionLine: string;
      year: string;
    }
  | {
      kind: "product";
      layout: "single" | "two";
      ctx: CatalogSlideContext;
      imageUrls: string[];
    };

export function buildPresentationPreviewSlides(
  coverCtx: CoverSlideContext,
  catalogSlides: CatalogOutputSlide[]
): PresentationPreviewSlide[] {
  const slides: PresentationPreviewSlide[] = [
    {
      kind: "cover",
      projectName: coverCtx.projectName,
      floorName: coverCtx.floorName,
      editionLine: coverCtx.editionLine,
      year: coverCtx.year,
    },
  ];

  for (const { ctx, plan } of catalogSlides) {
    if (plan.kind === "three") {
      slides.push({
        kind: "product",
        layout: "single",
        ctx,
        imageUrls: plan.imageUrls.slice(0, 1),
      });
      slides.push({
        kind: "product",
        layout: "two",
        ctx,
        imageUrls: plan.imageUrls.slice(1, 3),
      });
    } else {
      slides.push({
        kind: "product",
        layout: plan.kind,
        ctx,
        imageUrls: plan.imageUrls,
      });
    }
  }

  return slides;
}

export function previewImageSrc(url: string): string {
  if (url.startsWith("/")) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
