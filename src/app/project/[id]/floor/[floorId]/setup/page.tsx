"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Room } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Plus, Trash2, ChevronRight, Layers, Save, Pencil, Check, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableRoom({
  room,
  index,
  onDelete,
  onRename,
}: {
  room: Room;
  index: number;
  onDelete: () => void;
  onRename: (newName: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: room.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(room.name);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== room.name) onRename(trimmed);
    else setDraft(room.name);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(room.name);
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 shadow-sm group hover:border-amber-200 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-6 h-6 rounded-lg bg-secondary text-xs font-bold text-muted-foreground flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>

      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="flex-1 font-medium bg-transparent border-b border-amber-400 outline-none py-0.5 text-foreground"
          />
          <button onClick={commitEdit} className="text-amber-500 hover:text-amber-600 p-1 rounded-lg hover:bg-amber-50 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <span
            className="flex-1 font-medium text-foreground cursor-pointer"
            onDoubleClick={() => setEditing(true)}
          >
            {room.name}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500 transition-all p-1 rounded-lg hover:bg-amber-50"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </li>
  );
}

export default function SetupPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const floorId = params.floorId as string;
  const { projects, setRooms, presetRooms, updateItem } = useStore();
  const project = projects.find((p) => p.id === projectId);
  const floor = project?.floors.find((f) => f.id === floorId);

  const [rooms, setLocalRooms] = useState<Room[]>(floor?.rooms ?? []);
  const [newRoom, setNewRoom] = useState("");
  const shouldFocusAddRoom = searchParams.get("addRoom") === "1";
  const otherFloors = useMemo(
    () => project?.floors.filter((f) => f.id !== floorId).sort((a, b) => a.order - b.order) ?? [],
    [project, floorId]
  );
  const [copyFromFloorId, setCopyFromFloorId] = useState<string>(otherFloors[0]?.id ?? "");

  useEffect(() => {
    // If project loads after first render, ensure we have a default source floor.
    if (!copyFromFloorId && otherFloors[0]?.id) setCopyFromFloorId(otherFloors[0].id);
  }, [copyFromFloorId, otherFloors]);

  useEffect(() => {
    if (!shouldFocusAddRoom) return;
    // Input component doesn't forward refs, so focus via id.
    const el = document.getElementById("add-room-input") as HTMLInputElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus();
    el.select?.();
  }, [shouldFocusAddRoom]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!project || !floor) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">{!project ? "פרויקט לא נמצא" : "קומה לא נמצאה"}</p>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalRooms((prev) => {
        const oldIndex = prev.findIndex((r) => r.id === active.id);
        const newIndex = prev.findIndex((r) => r.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex).map((r, i) => ({ ...r, order: i }));
      });
    }
  };

  const addRoom = () => {
    const name = newRoom.trim();
    if (!name) return;
    setLocalRooms((prev) => [...prev, { id: crypto.randomUUID(), name, order: prev.length }]);
    setNewRoom("");
  };

  const deleteRoom = (id: string) => {
    setLocalRooms((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i })));
  };

  const renameRoom = (id: string, newName: string) => {
    setLocalRooms((prev) => prev.map((r) => (r.id === id ? { ...r, name: newName } : r)));
  };

  const addPresetRoom = (name: string) => {
    setLocalRooms((prev) => [...prev, { id: crypto.randomUUID(), name, order: prev.length }]);
  };

  const handleSave = () => {
    // Keep item.room entries valid after the room structure changes.
    // (If a room was deleted/truncated, its room_id would otherwise become dangling.)
    const roomIdSet = new Set(rooms.map((r) => r.id));
    for (const item of floor?.items ?? []) {
      const filtered = item.rooms.filter((r) => roomIdSet.has(r.room_id));
      if (filtered.length !== item.rooms.length) {
        updateItem(projectId, floorId, item.id, { rooms: filtered });
      }
    }
    setRooms(projectId, floorId, rooms);
    router.push(`/project/${projectId}/floor/${floorId}/items`);
  };

  const handleCopyRoomsFromFloor = () => {
    const sourceFloor = project?.floors.find((f) => f.id === copyFromFloorId);
    if (!sourceFloor) return;

    if ((floor?.items?.length ?? 0) > 0) {
      const ok = window.confirm(
        "יש כבר גופי תאורה בקומה הזו. ההעתקה תעדכן את מבנה החדרים ועלולה לגרום לאיבוד כמויות לחדרים שלא קיימים בתבנית. להמשיך?"
      );
      if (!ok) return;
    }

    const sourceRooms = [...sourceFloor.rooms].sort((a, b) => a.order - b.order);
    const targetRooms = [...rooms].sort((a, b) => a.order - b.order);

    const next: Room[] = [];
    for (let i = 0; i < sourceRooms.length; i++) {
      if (i < targetRooms.length) {
        next.push({ ...targetRooms[i], name: sourceRooms[i].name, order: i });
      } else {
        next.push({ id: crypto.randomUUID(), name: sourceRooms[i].name, order: i });
      }
    }
    setLocalRooms(next);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background" dir="rtl">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>חזרה לפרויקטים</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">חדרים — {floor.name}</h1>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Rooms section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">חדרים ואזורים</h2>
              <p className="text-xs text-muted-foreground mt-0.5">גרור כדי לשנות סדר</p>
            </div>
            <span className="tag-amber">{rooms.length} חדרים</span>
          </div>

          <div className="p-6">
            {/* Copy room structure from another floor */}
            {otherFloors.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  העתק מבנה חדרים מקומה אחרת
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <select
                      value={copyFromFloorId}
                      onChange={(e) => setCopyFromFloorId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none cursor-pointer"
                      dir="rtl"
                    >
                      {otherFloors.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCopyRoomsFromFloor}
                    disabled={!copyFromFloorId}
                    className="h-10 bg-slate-800 hover:bg-slate-700 text-white font-semibold gap-1.5 px-4 rounded-xl"
                  >
                    העתק
                  </Button>
                </div>
              </div>
            )}

            {/* Add room input */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="שם חדר — למשל: סלון, חדר שינה, כניסה..."
                id="add-room-input"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoom()}
                className="flex-1 h-10"
              />
              <Button onClick={addRoom} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0 h-10 px-4 gap-1.5">
                <Plus className="w-4 h-4" />
                הוסף
              </Button>
            </div>

            {/* Preset room chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {presetRooms.map((name) => {
                const already = rooms.some((r) => r.name === name);
                return (
                  <button
                    key={name}
                    onClick={() => !already && addPresetRoom(name)}
                    disabled={already}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      already
                        ? "bg-amber-50 border-amber-200 text-amber-400 cursor-default"
                        : "bg-secondary border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 cursor-pointer"
                    }`}
                  >
                    {already ? `✓ ${name}` : `+ ${name}`}
                  </button>
                );
              })}
            </div>

            {rooms.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>הוסף חדרים לפרויקט כדי להמשיך</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={rooms.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {rooms.map((room, index) => (
                      <SortableRoom
                        key={room.id}
                        room={room}
                        index={index}
                        onDelete={() => deleteRoom(room.id)}
                        onRename={(newName) => renameRoom(room.id, newName)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white font-semibold gap-2 rounded-xl"
        >
          <Save className="w-4 h-4" />
          שמור והמשך לגופי תאורה
        </Button>
      </div>
    </div>
  );
}
