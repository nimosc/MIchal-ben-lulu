import type { ScrapedData } from "@/types";

export type CatalogSpecFieldKey = keyof Pick<
  ScrapedData,
  | "lumens"
  | "ip_rating"
  | "light_source"
  | "finish_color"
  | "body_diameter"
  | "body_width"
  | "body_height"
  | "rosette_type"
  | "lamp_life_hours"
  | "luminaire_efficiency"
  | "glare_rating"
  | "reflector"
  | "lens_cover"
  | "beam_angle"
  | "adjustment"
  | "light_distribution"
>;

export type CatalogSpecFieldDef = {
  key: CatalogSpecFieldKey;
  label: string;
  type: "text" | "number";
};

export const CATALOG_SPEC_SECTIONS: { title: string; fields: CatalogSpecFieldDef[] }[] = [
  {
    title: "שורת מפרט (מצגת)",
    fields: [
      { key: "lumens", label: "לומן", type: "number" },
      { key: "ip_rating", label: "מוגנות מים (IP)", type: "text" },
      { key: "light_source", label: "מקור אור/נורה", type: "text" },
    ],
  },
  {
    title: "נתונים פיזיים",
    fields: [
      { key: "finish_color", label: "צבע גמר", type: "text" },
      { key: "body_diameter", label: "מידת גוף קוטר", type: "text" },
      { key: "body_width", label: "מידת גוף רוחב", type: "text" },
      { key: "body_height", label: "מידת גוף גובה", type: "text" },
      { key: "rosette_type", label: "סוג רוזטה", type: "text" },
    ],
  },
  {
    title: "נתוני חשמל",
    fields: [
      { key: "lamp_life_hours", label: "אורך חיים של מקור האור", type: "text" },
      { key: "luminaire_efficiency", label: "יעילות גוף תאורה", type: "text" },
      { key: "glare_rating", label: "רמת סינוור", type: "text" },
    ],
  },
  {
    title: "אופטיקה",
    fields: [
      { key: "reflector", label: "רפלקטור", type: "text" },
      { key: "lens_cover", label: "עדשה/כיסוי", type: "text" },
      { key: "beam_angle", label: "זווית הארה", type: "text" },
      { key: "adjustment", label: "כיוונון", type: "text" },
      { key: "light_distribution", label: "פיזור אור", type: "text" },
    ],
  },
];

export function setCatalogSpecField(
  scraped: ScrapedData,
  key: CatalogSpecFieldKey,
  raw: string
): ScrapedData {
  const def = CATALOG_SPEC_SECTIONS.flatMap((s) => s.fields).find((f) => f.key === key);
  if (!def) return scraped;
  if (def.type === "number") {
    const n = raw.trim() ? Number(raw) : null;
    return { ...scraped, [key]: n != null && !Number.isNaN(n) ? n : null };
  }
  return { ...scraped, [key]: raw.trim() || null };
}

export function catalogSpecFieldValue(
  scraped: ScrapedData,
  key: CatalogSpecFieldKey
): string {
  const v = scraped[key];
  if (v == null) return "";
  return String(v);
}
