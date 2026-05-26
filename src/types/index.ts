export interface Room {
  id: string;
  name: string;
  order: number;
}

export interface ItemRoom {
  room_id: string;
  qty: number;
}

export interface ProductVariant {
  label: string;
  model?: string | null;
  color_temp_k?: number | null;
  cri?: number | null;
  watt_per_unit?: number | null;
  voltage?: string | null;
  current?: string | null;
  max_ceiling_height_cm?: number | null;
  lumens?: number | null;
  ip_rating?: string | null;
  light_source?: string | null;
  finish_color?: string | null;
  body_diameter?: string | null;
  body_width?: string | null;
  body_height?: string | null;
  rosette_type?: string | null;
  lamp_life_hours?: string | null;
  luminaire_efficiency?: string | null;
  glare_rating?: string | null;
  reflector?: string | null;
  lens_cover?: string | null;
  beam_angle?: string | null;
  adjustment?: string | null;
  light_distribution?: string | null;
}

export interface ScrapedData {
  product_name: string | null;
  manufacturer: string | null;
  model: string | null;
  color_temp_k: number | null;
  cri: number | null;
  watt_per_unit: number | null;
  voltage: string | null;
  current: string | null;
  max_ceiling_height_cm: number | null;
  main_image_url: string | null;
  product_description: string | null;
  image_urls?: string[];
  selected_image_urls?: string[];
  variants?: ProductVariant[] | null;
  tech_spec_url?: string | null;
  mounting_instructions_url?: string | null;
  /** שורת מפרט תחתונה */
  lumens?: number | null;
  ip_rating?: string | null;
  light_source?: string | null;
  /** נתונים פיזיים */
  finish_color?: string | null;
  body_diameter?: string | null;
  body_width?: string | null;
  body_height?: string | null;
  rosette_type?: string | null;
  /** נתוני חשמל (מעבר לדרייבר/שליטה על הפריט) */
  lamp_life_hours?: string | null;
  luminaire_efficiency?: string | null;
  glare_rating?: string | null;
  /** אופטיקה */
  reflector?: string | null;
  lens_cover?: string | null;
  beam_angle?: string | null;
  adjustment?: string | null;
  light_distribution?: string | null;
}

export interface Accessory {
  id: string;
  product_url: string;
  body_description: string;
  unit_type: "יח'" | "מטר";
  price_per_unit: number;
  rooms: ItemRoom[];
  scraped: ScrapedData | null;
  scraped_status: "pending" | "loading" | "done" | "error";
}

/** Reusable lighting body spec (no mark, rooms, or accessories). */
export interface SavedLightingTemplate {
  id: string;
  saved_at: string;
  product_url: string;
  driver_location: string;
  dimming_method: string;
  body_description: string;
  unit_type: "יח'" | "מטר";
  price_per_unit: number;
  scraped: ScrapedData | null;
}

export interface LightingItem {
  id: string;
  section_id: number;
  mark: string;
  product_url: string;
  driver_location: string;
  dimming_method: string;
  importer: string;
  body_description: string;
  unit_type: "יח'" | "מטר";
  price_per_unit: number;
  rooms: ItemRoom[];
  scraped: ScrapedData | null;
  scraped_status: "pending" | "loading" | "done" | "error";
  accessories: Accessory[];
}

export interface Floor {
  id: string;
  name: string;
  order: number;
  rooms: Room[];
  items: LightingItem[];
}

export interface Project {
  id: string;
  name: string;
  webhook_url: string;
  floors: Floor[];
  created_at: string;
  updated_at: string;
}
