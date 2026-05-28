import type { ProductVariant, ScrapedData } from "@/types";

export const emptyScraped = (): ScrapedData => ({
  product_name: null,
  manufacturer: null,
  model: null,
  color_temp_k: null,
  cri: null,
  watt_per_unit: null,
  voltage: null,
  current: null,
  max_ceiling_height_cm: null,
  main_image_url: null,
  product_description: null,
  image_urls: undefined,
  selected_image_urls: [],
  variants: null,
  tech_spec_url: null,
  mounting_instructions_url: null,
  lumens: null,
  ip_rating: null,
  light_source: null,
  finish_color: null,
  body_diameter: null,
  body_width: null,
  body_height: null,
  rosette_type: null,
  lamp_life_hours: null,
  luminaire_efficiency: null,
  glare_rating: null,
  reflector: null,
  lens_cover: null,
  beam_angle: null,
  adjustment: null,
  light_distribution: null,
});

/** ממלא שדות חסרים בנתונים ישנים מ-localStorage */
export function normalizeScraped(raw: ScrapedData | null | undefined): ScrapedData {
  if (!raw) return emptyScraped();
  return {
    ...emptyScraped(),
    ...raw,
    selected_image_urls: raw.selected_image_urls ?? [],
  };
}

const VARIANT_OVERRIDE_KEYS = [
  "model",
  "color_temp_k",
  "cri",
  "watt_per_unit",
  "voltage",
  "current",
  "max_ceiling_height_cm",
  "lumens",
  "ip_rating",
  "light_source",
  "finish_color",
  "body_diameter",
  "body_width",
  "body_height",
  "rosette_type",
  "lamp_life_hours",
  "luminaire_efficiency",
  "glare_rating",
  "reflector",
  "lens_cover",
  "beam_angle",
  "adjustment",
  "light_distribution",
] as const satisfies readonly (keyof ProductVariant)[];

export function mergeVariantIntoScraped(
  data: ScrapedData,
  variant: ProductVariant
): ScrapedData {
  const merged: ScrapedData = { ...data };
  for (const key of VARIANT_OVERRIDE_KEYS) {
    const v = variant[key];
    if (v !== undefined && v !== null) {
      merged[key] = v as never;
    }
  }
  return merged;
}

export function formatLumens(lumens: number | null | undefined): string | null {
  if (lumens == null || Number.isNaN(lumens)) return null;
  return `${lumens}lm`;
}

export function formatVoltageCurrent(
  voltage: string | null | undefined,
  current: string | null | undefined
): string {
  const parts = [voltage?.trim(), current?.trim()].filter(Boolean);
  return parts.join(" / ");
}

/** תמונות לייצוא מצגת/קטלוג — רק נבחרות, או main אם לא נבחר כלום */
export function resolveSelectedImageUrls(scraped: ScrapedData | null | undefined): string[] {
  if (!scraped) return [];
  const selected =
    scraped.selected_image_urls?.map((u) => u.trim()).filter(Boolean) ?? [];
  const urls = selected.length > 0 ? selected : scraped.main_image_url?.trim() ? [scraped.main_image_url.trim()] : [];
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}
