import { normalizeScraped } from "@/lib/scrapedData";
import { Floor, LightingItem, Project, Room } from "@/types";

export function normalizeLightingItem(item: LightingItem): LightingItem {
  return {
    ...item,
    importer: item.importer ?? "",
    scraped: item.scraped ? normalizeScraped(item.scraped) : null,
  };
}

export function calcItemTotals(item: LightingItem) {
  const totalUnits = item.rooms.reduce((s, r) => s + r.qty, 0);
  const totalPriceExVat = totalUnits * item.price_per_unit;
  const totalWatt = totalUnits * (item.scraped?.watt_per_unit ?? 0);
  return { totalUnits, totalPriceExVat, totalWatt };
}

export function calcFloorTotals(floor: Floor) {
  return floor.items.reduce(
    (acc, item) => {
      const t = calcItemTotals(item);
      return {
        itemCount: acc.itemCount + 1,
        totalUnits: acc.totalUnits + t.totalUnits,
        totalPrice: acc.totalPrice + t.totalPriceExVat,
        totalWatt: acc.totalWatt + t.totalWatt,
      };
    },
    { itemCount: 0, totalUnits: 0, totalPrice: 0, totalWatt: 0 }
  );
}

export function calcProjectTotals(project: Project) {
  return project.floors.reduce(
    (acc, floor) => {
      const t = calcFloorTotals(floor);
      return {
        floorCount: acc.floorCount + 1,
        itemCount: acc.itemCount + t.itemCount,
        totalUnits: acc.totalUnits + t.totalUnits,
        totalPrice: acc.totalPrice + t.totalPrice,
        totalWatt: acc.totalWatt + t.totalWatt,
        roomCount: acc.roomCount + floor.rooms.length,
      };
    },
    { floorCount: 0, itemCount: 0, totalUnits: 0, totalPrice: 0, totalWatt: 0, roomCount: 0 }
  );
}

export function getFloor(project: Project, floorId: string): Floor | undefined {
  return project.floors.find((f) => f.id === floorId);
}

export function createFloor(
  name: string,
  order: number,
  rooms: Room[] = [],
  items: LightingItem[] = []
): Floor {
  return { id: crypto.randomUUID(), name, order, rooms, items };
}

/** Migrate legacy projects that had rooms/items at project root */
export function migrateProject(raw: Record<string, unknown>): Project {
  if (Array.isArray(raw.floors)) {
    const project = raw as unknown as Project;
    return {
      ...project,
      floors: project.floors.map((floor) => ({
        ...floor,
        items: floor.items.map(normalizeLightingItem),
      })),
    };
  }
  const legacyRooms = (raw.rooms as Room[] | undefined) ?? [];
  const legacyItems = (raw.items as LightingItem[] | undefined) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rooms: _legacyRooms, items: _legacyItems, ...rest } = raw;
  return {
    ...(rest as Omit<Project, "floors">),
      floors: [
        createFloor(
          "קומת קרקע",
          0,
          legacyRooms,
          legacyItems.map(normalizeLightingItem)
        ),
      ],
  };
}
