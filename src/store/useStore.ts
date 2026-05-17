import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createFloor, migrateProject } from "@/lib/project";
import { Floor, LightingItem, Project, Room, ScrapedData } from "@/types";

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

interface StoreState {
  projects: Project[];
  presetRooms: string[];
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
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      projects: [],
      presetRooms: [
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
      ],

      setPresetRooms: (rooms) => set({ presetRooms: rooms }),

      addProject: (name) =>
        set((state) => ({
          projects: [
            ...state.projects,
            {
              id: crypto.randomUUID(),
              name,
              webhook_url: "",
              floors: [createFloor("קומת קרקע", 0)],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

      updateProject: (id, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? touchProject({ ...p, ...data }) : p
          ),
        })),

      addFloor: (projectId, name) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? touchProject({
                  ...p,
                  floors: [...p.floors, createFloor(name.trim(), p.floors.length)],
                })
              : p
          ),
        })),

      deleteFloor: (projectId, floorId) =>
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
        })),

      updateFloor: (projectId, floorId, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? touchProject({
                  ...p,
                  floors: p.floors.map((f) => (f.id === floorId ? { ...f, ...data } : f)),
                })
              : p
          ),
        })),

      setRooms: (projectId, floorId, rooms) =>
        set((state) => ({
          projects: state.projects.flatMap((p) =>
            mapFloor(p, projectId, floorId, (f) => ({ ...f, rooms }))
          ),
        })),

      addItem: (projectId, floorId, item) =>
        set((state) => ({
          projects: state.projects.flatMap((p) =>
            mapFloor(p, projectId, floorId, (f) => ({
              ...f,
              items: [...f.items, item],
            }))
          ),
        })),

      updateItem: (projectId, floorId, itemId, data) =>
        set((state) => ({
          projects: state.projects.flatMap((p) =>
            mapFloor(p, projectId, floorId, (f) => ({
              ...f,
              items: f.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
            }))
          ),
        })),

      deleteItem: (projectId, floorId, itemId) =>
        set((state) => ({
          projects: state.projects.flatMap((p) =>
            mapFloor(p, projectId, floorId, (f) => ({
              ...f,
              items: f.items.filter((i) => i.id !== itemId),
            }))
          ),
        })),

      setScraped: (projectId, floorId, itemId, scraped) =>
        set((state) => ({
          projects: state.projects.flatMap((p) =>
            mapFloor(p, projectId, floorId, (f) => ({
              ...f,
              items: f.items.map((i) =>
                i.id === itemId ? { ...i, scraped, scraped_status: "done" } : i
              ),
            }))
          ),
        })),

      setScrapedStatus: (projectId, floorId, itemId, status) =>
        set((state) => ({
          projects: state.projects.flatMap((p) =>
            mapFloor(p, projectId, floorId, (f) => ({
              ...f,
              items: f.items.map((i) =>
                i.id === itemId ? { ...i, scraped_status: status } : i
              ),
            }))
          ),
        })),
    }),
    {
      name: "lighting-store",
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { projects?: Record<string, unknown>[]; presetRooms?: string[] };
        if (version < 2 && state.projects) {
          return {
            ...state,
            projects: state.projects.map((p) => migrateProject(p)),
          };
        }
        return persisted;
      },
    }
  )
);
