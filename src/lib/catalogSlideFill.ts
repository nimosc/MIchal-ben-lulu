import type { Accessory, Floor, LightingItem, Project, ScrapedData } from "@/types";
import { formatCatalogRoomNames } from "@/lib/catalogPresentation";
import { calcItemTotals } from "@/lib/project";
import {
  formatLumens,
  formatVoltageCurrent,
  resolveSelectedImageUrls,
} from "@/lib/scrapedData";

export interface CatalogSlideContext {
  projectName: string;
  floorName: string;
  mark: string;
  productUrl: string;
  roomNames: string;
  productTitle: string;
  manufacturerSuffix: string;
  description: string;
  cri: string;
  lumens: string;
  colorTemp: string;
  watt: string;
  voltageCurrent: string;
  totalUnits: string;
  unitLabel: string;
  ip: string;
  sku: string;
  lightSource: string;
  mountingUrl: string;
  reflector: string;
  lensCover: string;
  beamAngle: string;
  adjustment: string;
  lightDistribution: string;
  lampLife: string;
  efficiency: string;
  glare: string;
  driverLocation: string;
  dimmingMethod: string;
  finishColor: string;
  bodyDiameter: string;
  bodyWidth: string;
  bodyHeight: string;
  rosetteType: string;
  importer: string;
  imageUrl: string | null;
  imageUrls: string[];
}

function bodyText(scraped: ScrapedData | null, fallback: string): string {
  return scraped?.product_description?.trim() || fallback || "";
}

function buildFromScraped(
  scraped: ScrapedData | null,
  extras: {
    mark: string;
    productUrl: string;
    roomNames: string;
    driverLocation: string;
    dimmingMethod: string;
    importer: string;
    totalUnits: number;
    unitType: string;
    bodyDescription: string;
  }
): CatalogSlideContext {
  const s = scraped;
  const productName = s?.product_name?.trim() || "מוצר";
  const manufacturer = s?.manufacturer?.trim() || "";
  const voltageCurrent = formatVoltageCurrent(s?.voltage, s?.current);

  const uniqueImageUrls = resolveSelectedImageUrls(s);

  return {
    projectName: "",
    floorName: "",
    mark: extras.mark,
    productUrl: extras.productUrl?.trim() || "",
    roomNames: extras.roomNames,
    productTitle: productName.toUpperCase(),
    manufacturerSuffix: manufacturer ? `_${manufacturer}` : "",
    description: bodyText(s, extras.bodyDescription),
    cri: s?.cri != null ? `${s.cri}<` : "",
    lumens: formatLumens(s?.lumens) || "",
    colorTemp: s?.color_temp_k ? `${s.color_temp_k}K` : "",
    watt: s?.watt_per_unit ? `${s.watt_per_unit}W` : "",
    voltageCurrent,
    totalUnits: String(extras.totalUnits || ""),
    unitLabel: extras.unitType === "מטר" ? "סה\"כ (מטרים)" : "סה\"כ (יח'/מטרים)",
    ip: s?.ip_rating?.trim() || "",
    sku: s?.model?.trim() || "",
    lightSource: s?.light_source?.trim() || "",
    mountingUrl: s?.mounting_instructions_url?.trim() || "",
    reflector: s?.reflector?.trim() || "",
    lensCover: s?.lens_cover?.trim() || "",
    beamAngle: s?.beam_angle?.trim() || "",
    adjustment: s?.adjustment?.trim() || "",
    lightDistribution: s?.light_distribution?.trim() || "",
    lampLife: s?.lamp_life_hours?.trim() || "",
    efficiency: s?.luminaire_efficiency?.trim() || "",
    glare: s?.glare_rating?.trim() || "",
    driverLocation: extras.driverLocation || "",
    dimmingMethod: extras.dimmingMethod || "",
    finishColor: s?.finish_color?.trim() || "",
    bodyDiameter: s?.body_diameter?.trim() || "",
    bodyWidth: s?.body_width?.trim() || "",
    bodyHeight: s?.body_height?.trim() || "",
    rosetteType: s?.rosette_type?.trim() || "",
    importer: extras.importer || "",
    imageUrl: uniqueImageUrls[0] ?? null,
    imageUrls: uniqueImageUrls,
  };
}

export function buildItemSlideContext(
  project: Project,
  floor: Floor,
  item: LightingItem
): CatalogSlideContext {
  const totals = calcItemTotals(item);
  const ctx = buildFromScraped(item.scraped, {
    mark: item.mark,
    productUrl: item.product_url?.trim() || "",
    roomNames: formatCatalogRoomNames(floor, item.rooms),
    driverLocation: item.driver_location,
    dimmingMethod: item.dimming_method,
    importer: item.importer || "",
    totalUnits: totals.totalUnits,
    unitType: item.unit_type,
    bodyDescription: item.body_description,
  });
  ctx.projectName = project.name;
  ctx.floorName = floor.name;
  return ctx;
}

export function buildAccessorySlideContext(
  project: Project,
  floor: Floor,
  item: LightingItem,
  accessory: Accessory,
  index: number
): CatalogSlideContext {
  const rooms = accessory.rooms.length > 0 ? accessory.rooms : item.rooms;
  const totalUnits = rooms.reduce((s, r) => s + r.qty, 0);
  const ctx = buildFromScraped(accessory.scraped, {
    mark: `${item.mark}.${index + 1}`,
    productUrl: accessory.product_url?.trim() || "",
    roomNames: formatCatalogRoomNames(floor, rooms),
    driverLocation: item.driver_location,
    dimmingMethod: item.dimming_method,
    importer: item.importer || "",
    totalUnits,
    unitType: accessory.unit_type,
    bodyDescription: accessory.body_description,
  });
  const name = accessory.scraped?.product_name?.trim();
  if (name) ctx.productTitle = name.toUpperCase();
  ctx.projectName = project.name;
  ctx.floorName = floor.name;
  return ctx;
}

export interface CoverSlideContext {
  projectName: string;
  floorName: string;
  editionLine: string;
  year: string;
}

export function buildCoverSlideContext(project: Project, floor: Floor): CoverSlideContext {
  const now = new Date();
  const months = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  return {
    projectName: project.name,
    floorName: floor.name,
    editionLine: `מהדורה 1 ${months[now.getMonth()]}`,
    year: String(now.getFullYear()),
  };
}
