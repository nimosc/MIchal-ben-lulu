import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { createFloor, migrateProject } from "@/lib/project";
import { upsertItemHistory } from "@/lib/itemHistory";
import {
  Accessory,
  Floor,
  LightingItem,
  Project,
  Room,
  SavedLightingTemplate,
  ScrapedData,
} from "@/types";

function touchProject(p: Project): Project {
  return { ...p, updated_at: new Date().toISOString() };
}

function mapFloor(
  project: Project,
  projectId: string,
  floorId: string,
  updater: (floor: Floor) => Floor
): Project[] {
  return project.id !== projectId
    ? [project]
    : [
        touchProject({
          ...project,
          floors: project.floors.map((f) => (f.id === floorId ? updater(f) : f)),
        }),
      ];
}

function mapItem(
  project: Project,
  projectId: string,
  floorId: string,
  itemId: string,
  updater: (item: LightingItem) => LightingItem
): Project[] {
  return mapFloor(project, projectId, floorId, (f) => ({
    ...f,
    items: f.items.map((i) => (i.id === itemId ? updater(i) : i)),
  }));
}

function syncProject(project: Project) {
  supabase
    .from("projects")
    .upsert({
      id: project.id,
      name: project.name,
      webhook_url: project.webhook_url,
      floors: project.floors,
      created_at: project.created_at,
      updated_at: project.updated_at,
    })
    .then(({ error }) => {
      if (error) console.error("[Supabase] project sync error:", error);
    });
}

function syncSettings(presetRooms: string[], itemHistory: SavedLightingTemplate[]) {
  supabase
    .from("app_settings")
    .upsert({ key: "global", value: { presetRooms, itemHistory } })
    .then(({ error }) => {
      if (error) console.error("[Supabase] settings sync error:", error);
    });
}

const defaultPresetRooms = [
  "מטבח",
  "סלון",
  "סלון משני",
  "חדר מזווה/שירות",
  "פינת אוכל",
  "מסדרון",
  "מדרגות/חלל מעבר",
  "חדר אורחים",
  "חדר כביסה",
  'חדר ממ"ד/עבודה',
  "אמבטיה כללית",
  "חדר ילדים",
  "חדר שינה מאסטר",
  "חדר רחצה מאסטר",
];

interface StoreState {
  projects: Project[];
  presetRooms: string[];
  itemHistory: SavedLightingTemplate[];
  isLoaded: boolean;
  initialize: () => Promise<void>;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  addFloor: (projectId: string, name: string) => void;
  deleteFloor: (projectId: string, floorId: string) => void;
  updateFloor: (projectId: string, floorId: string, data: Partial<Pick<Floor, "name" | "order">>) => void;
  setRooms: (projectId: string, floorId: string, rooms: Room[]) => void;
  addItem: (projectId: string, floorId: string, item: LightingItem) => void;
  updateItem: (projectId: string, floorId: string, itemId: string, data: Partial<LightingItem>) => void;
  deleteItem: (projectId: string, floorId: string, itemId: string) => void;
  setScraped: (projectId: string, floorId: string, itemId: string, scraped: ScrapedData) => void;
  setScrapedStatus: (
    projectId: string,
    floorId: string,
    itemId: string,
    status: LightingItem["scraped_status"]
  ) => void;
  setPresetRooms: (rooms: string[]) => void;
  addAccessory: (projectId: string, floorId: string, itemId: string, accessory: Accessory) => void;
  updateAccessory: (projectId: string, floorId: string, itemId: string, accessoryId: string, data: Partial<Accessory>) => void;
  deleteAccessory: (projectId: string, floorId: string, itemId: string, accessoryId: string) => void;
  saveItemTemplate: (data: Omit<SavedLightingTemplate, "id" | "saved_at">) => void;
  removeItemTemplate: (id: string) => void;
}

export const useStore = create<StoreState>()((set, get) => ({
  projects: [],
  itemHistory: [],
  presetRooms: defaultPresetRooms,
  isLoaded: false,

  initialize: async () => {
    const [projectsResult, settingsResult] = await Promise.all([
      supabase.from("projects").select("*").order("created_at"),
      supabase.from("app_settings").select("value").eq("key", "global").maybeSingle(),
    ]);

    if (projectsResult.error) {
      console.error("[Supabase] load projects error:", projectsResult.error);
    }
    if (settingsResult.error) {
      console.error("[Supabase] load settings error:", settingsResult.error);
    }

    type Settings = { presetRooms?: string[]; itemHistory?: SavedLightingTemplate[] };
    const settings = settingsResult.data?.value as Settings | null;

    // Migrate any legacy data in floors
    const projects = (projectsResult.data ?? []).map((row) => {
      const p = {
        id: row.id,
        name: row.name,
        webhook_url: row.webhook_url,
        floors: row.floors as Floor[],
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return migrateProject(p as any) as unknown as Project;
    });

    set({
      projects,
      presetRooms: settings?.presetRooms ?? defaultPresetRooms,
      itemHistory: settings?.itemHistory ?? [],
      isLoaded: true,
    });
  },

  setPresetRooms: (rooms) => {
    set({ presetRooms: rooms });
    const { itemHistory } = get();
    syncSettings(rooms, itemHistory);
  },

  addProject: (name) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      webhook_url: "",
      floors: [createFloor("קומת קרקע", 0)],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    syncProject(newProject);
  },

  deleteProject: (id) => {
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
    supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[Supabase] delete project error:", error);
      });
  },

  updateProject: (id, data) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? touchProject({ ...p, ...data }) : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === id);
    if (updated) syncProject(updated);
  },

  addFloor: (projectId, name) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? touchProject({
              ...p,
              floors: [...p.floors, createFloor(name.trim(), p.floors.length)],
            })
          : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  deleteFloor: (projectId, floorId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? touchProject({
              ...p,
              floors: p.floors
                .filter((f) => f.id !== floorId)
                .map((f, i) => ({ ...f, order: i })),
            })
          : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  updateFloor: (projectId, floorId, data) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? touchProject({
              ...p,
              floors: p.floors.map((f) => (f.id === floorId ? { ...f, ...data } : f)),
            })
          : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  setRooms: (projectId, floorId, rooms) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapFloor(p, projectId, floorId, (f) => ({ ...f, rooms }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  addItem: (projectId, floorId, item) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapFloor(p, projectId, floorId, (f) => ({
          ...f,
          items: [...f.items, item],
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  updateItem: (projectId, floorId, itemId, data) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapFloor(p, projectId, floorId, (f) => ({
          ...f,
          items: f.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  deleteItem: (projectId, floorId, itemId) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapFloor(p, projectId, floorId, (f) => ({
          ...f,
          items: f.items.filter((i) => i.id !== itemId),
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  setScraped: (projectId, floorId, itemId, scraped) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapFloor(p, projectId, floorId, (f) => ({
          ...f,
          items: f.items.map((i) =>
            i.id === itemId ? { ...i, scraped, scraped_status: "done" } : i
          ),
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  setScrapedStatus: (projectId, floorId, itemId, status) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapFloor(p, projectId, floorId, (f) => ({
          ...f,
          items: f.items.map((i) =>
            i.id === itemId ? { ...i, scraped_status: status } : i
          ),
        }))
      ),
    }));
  },

  addAccessory: (projectId, floorId, itemId, accessory) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapItem(p, projectId, floorId, itemId, (i) => ({
          ...i,
          accessories: [...(i.accessories ?? []), accessory],
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  updateAccessory: (projectId, floorId, itemId, accessoryId, data) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapItem(p, projectId, floorId, itemId, (i) => ({
          ...i,
          accessories: (i.accessories ?? []).map((a) =>
            a.id === accessoryId ? { ...a, ...data } : a
          ),
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  deleteAccessory: (projectId, floorId, itemId, accessoryId) => {
    set((state) => ({
      projects: state.projects.flatMap((p) =>
        mapItem(p, projectId, floorId, itemId, (i) => ({
          ...i,
          accessories: (i.accessories ?? []).filter((a) => a.id !== accessoryId),
        }))
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) syncProject(updated);
  },

  saveItemTemplate: (data) => {
    set((state) => ({
      itemHistory: upsertItemHistory(state.itemHistory, data),
    }));
    const { presetRooms, itemHistory } = get();
    syncSettings(presetRooms, itemHistory);
  },

  removeItemTemplate: (id) => {
    set((state) => ({
      itemHistory: state.itemHistory.filter((h) => h.id !== id),
    }));
    const { presetRooms, itemHistory } = get();
    syncSettings(presetRooms, itemHistory);
  },
}));

