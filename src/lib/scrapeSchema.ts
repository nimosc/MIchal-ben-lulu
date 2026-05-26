/** שדות לסכמת כלי הסקרייפ — משותף ל-route */
export const SCRAPE_STRING_FIELDS = [
  "product_name",
  "manufacturer",
  "model",
  "voltage",
  "current",
  "main_image_url",
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
] as const;

export const SCRAPE_NUMBER_FIELDS = [
  "color_temp_k",
  "cri",
  "watt_per_unit",
  "max_ceiling_height_cm",
  "lumens",
] as const;

export const SCRAPE_VARIANT_STRING_FIELDS = [
  "model",
  "voltage",
  "current",
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
] as const;

export const SCRAPE_VARIANT_NUMBER_FIELDS = [
  "color_temp_k",
  "cri",
  "watt_per_unit",
  "max_ceiling_height_cm",
  "lumens",
] as const;

function schemaProps(keys: readonly string[], type: "string" | "number") {
  const t = type === "string" ? ["string", "null"] : ["number", "null"];
  return Object.fromEntries(keys.map((k) => [k, { type: t }]));
}

export function buildScrapeToolSchema() {
  return {
    type: "object" as const,
    properties: {
      ...schemaProps(SCRAPE_STRING_FIELDS, "string"),
      ...schemaProps(SCRAPE_NUMBER_FIELDS, "number"),
      product_description: {
        type: ["string", "null"],
        description: "Short Hebrew description, 1-3 sentences",
      },
      variants: {
        type: ["array", "null"],
        description: "Product variants if multiple models exist on page, max 8",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            ...schemaProps(SCRAPE_VARIANT_STRING_FIELDS, "string"),
            ...schemaProps(SCRAPE_VARIANT_NUMBER_FIELDS, "number"),
          },
          required: ["label"],
        },
      },
    },
  };
}
