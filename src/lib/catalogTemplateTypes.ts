/** סוגי תבנית מצגת — קובץ PPTX נפרד לכל סוג */

export type CatalogTemplateKind = "cover" | "single" | "two" | "three";

export const CATALOG_TEMPLATE_KINDS: CatalogTemplateKind[] = [
  "cover",
  "single",
  "two",
  "three",
];

export type CatalogTemplateKindConfig = {
  kind: CatalogTemplateKind;
  label: string;
  description: string;
  defaultPath: string;
  defaultFilename: string;
  imageSlots: number;
  slideCount: number;
};

export const CATALOG_TEMPLATE_CONFIG: Record<CatalogTemplateKind, CatalogTemplateKindConfig> = {
  cover: {
    kind: "cover",
    label: "שער",
    description: "שקופית שער אחת (slide1)",
    defaultPath: "/templates/cover-template.pptx",
    defaultFilename: "cover-template.pptx",
    imageSlots: 0,
    slideCount: 1,
  },
  single: {
    kind: "single",
    label: "תמונה אחת",
    description: "מוצר עם תמונה אחת — שקופית אחת",
    defaultPath: "/templates/single-image-template.pptx",
    defaultFilename: "single-image-template.pptx",
    imageSlots: 1,
    slideCount: 1,
  },
  two: {
    kind: "two",
    label: "2 תמונות",
    description: "מוצר עם 2 תמונות — שקופית אחת",
    defaultPath: "/templates/two-images-template.pptx",
    defaultFilename: "two-images-template.pptx",
    imageSlots: 2,
    slideCount: 1,
  },
  three: {
    kind: "three",
    label: "3 תמונות (2 שקפים)",
    description:
      "מוצר עם 3 תמונות — קובץ אחד עם 2 שקפים: slide1 תמונה אחת, slide2 שתי תמונות",
    defaultPath: "/templates/three-images-template.pptx",
    defaultFilename: "three-images-template.pptx",
    imageSlots: 3,
    slideCount: 2,
  },
};

export type CatalogSlidePlan = {
  kind: "single" | "two" | "three";
  imageUrls: string[];
};

/**
 * 3 תמונות → תבנית three (קובץ אחד, 2 שקפים).
 * אחרת single / two / שילוב ל-4+.
 */
export function planCatalogSlides(imageUrls: string[]): CatalogSlidePlan[] {
  const urls = [...new Set(imageUrls.map((u) => u.trim()).filter(Boolean))].slice(0, 20);
  if (urls.length === 0) {
    return [{ kind: "single", imageUrls: [] }];
  }

  const plans: CatalogSlidePlan[] = [];
  let i = 0;
  while (i < urls.length) {
    const rem = urls.length - i;
    if (rem === 1) {
      plans.push({ kind: "single", imageUrls: urls.slice(i, i + 1) });
      i += 1;
    } else if (rem === 2) {
      plans.push({ kind: "two", imageUrls: urls.slice(i, i + 2) });
      i += 2;
    } else if (rem === 3) {
      plans.push({ kind: "three", imageUrls: urls.slice(i, i + 3) });
      i += 3;
    } else {
      if (rem % 2 === 1) {
        plans.push({ kind: "single", imageUrls: urls.slice(i, i + 1) });
        i += 1;
      }
      while (i < urls.length) {
        plans.push({ kind: "two", imageUrls: urls.slice(i, i + 2) });
        i += 2;
      }
    }
  }
  return plans;
}
