"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronRight,
  Settings,
  RotateCcw,
  Pencil,
  Check,
  X,
} from "lucide-react";
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

const DEFAULT_PRESET_ROOMS = [
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

function SortablePreset({
  id,
  name,
  onDelete,
  onRename,
}: {
  id: string;
  name: string;
  onDelete: () => void;
  onRename: (newName: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-sm group hover:border-amber-200 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </button>

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
            className="flex-1 text-sm font-medium bg-transparent border-b border-amber-400 outline-none py-0.5 text-foreground"
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
            className="flex-1 font-medium text-foreground text-sm cursor-pointer"
            onDoubleClick={() => setEditing(true)}
          >
            {name}
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

export default function SettingsPage() {
  const router = useRouter();
  const { presetRooms, setPresetRooms } = useStore();

  const [rooms, setRooms] = useState<string[]>(presetRooms);
  const [newRoom, setNewRoom] = useState("");
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRooms((prev) => {
        const oldIndex = prev.findIndex((_, i) => `${i}` === active.id);
        const newIndex = prev.findIndex((_, i) => `${i}` === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const addRoom = () => {
    const name = newRoom.trim();
    if (!name || rooms.includes(name)) return;
    setRooms((prev) => [...prev, name]);
    setNewRoom("");
  };

  const deleteRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const renameRoom = (index: number, newName: string) => {
    setRooms((prev) => prev.map((r, i) => (i === index ? newName : r)));
  };

  const handleSave = () => {
    setPresetRooms(rooms);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm("לאפס לרשימת ברירת המחדל?")) {
      setRooms(DEFAULT_PRESET_ROOMS);
    }
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
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">הגדרות</h1>
              <p className="text-sm text-muted-foreground">ניהול רשימת חדרים מהירים</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">חדרים מהירים</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                אלו החדרים שיופיעו כאפשרות הוספה מהירה בכל פרויקט
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tag-amber">{rooms.length} חדרים</span>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                איפוס
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Add input */}
            <div className="flex gap-2">
              <Input
                placeholder="שם חדר חדש..."
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoom()}
                className="flex-1 h-10"
              />
              <Button
                onClick={addRoom}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white border-0 h-10 px-4 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                הוסף
              </Button>
            </div>

            {/* Sortable list */}
            {rooms.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                אין חדרים ברשימה
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={rooms.map((_, i) => `${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {rooms.map((name, index) => (
                      <SortablePreset
                        key={`${index}-${name}`}
                        id={`${index}`}
                        name={name}
                        onDelete={() => deleteRoom(index)}
                        onRename={(newName) => renameRoom(index, newName)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            {/* Save */}
            <Button
              onClick={handleSave}
              className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl mt-2"
            >
              {saved ? "נשמר!" : "שמור שינויים"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
