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
