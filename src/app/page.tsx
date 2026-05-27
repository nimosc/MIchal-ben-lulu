"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { calcProjectTotals } from "@/lib/project";
import { Input } from "@/components/ui/input";
import { Trash2, FolderOpen, Plus, Layers, Lightbulb, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function HomePage() {
  const router = useRouter();
  const { projects, addProject, deleteProject } = useStore();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addProject(trimmed);
    setNewName("");
    setAdding(false);
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Hero */}
      <div className="bg-gradient-to-bl from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-4">
            <Lightbulb className="w-4 h-4" />
            <span>מערכת ניהול מפרטים</span>
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">פרויקטי תאורה</h1>
          <p className="text-slate-400 text-base max-w-md">
            ניהול מפרטי גופי תאורה לפרויקטי עיצוב פנים — מסעיף ועד שליחה אוטומטית
          </p>

          <div className="mt-8 flex items-center gap-3">
            {adding ? (
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2 backdrop-blur-sm">
                <Input
                  placeholder="שם הפרויקט..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") { setAdding(false); setNewName(""); }
                  }}
                  autoFocus
                  className="bg-transparent border-0 text-white placeholder:text-slate-400 focus-visible:ring-0 w-56 p-0 h-auto"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  צור
                </button>
                <button
                  onClick={() => { setAdding(false); setNewName(""); }}
                  className="text-slate-400 hover:text-white text-sm px-2 py-1.5 transition-colors"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-900/30"
              >
                <Plus className="w-4 h-4" />
                פרויקט חדש
              </button>
            )}
            <span className="text-slate-500 text-sm">{projects.length} פרויקטים</span>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">אין פרויקטים עדיין</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              לחץ על &quot;פרויקט חדש&quot; כדי להתחיל לנהל את מפרטי התאורה שלך
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const totals = calcProjectTotals(project);

              return (
                <div
                  key={project.id}
                  className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  {/* Color bar */}
                  <div className="h-1.5 bg-gradient-to-l from-amber-400 to-amber-500" />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-foreground text-lg leading-tight truncate group-hover:text-amber-600 transition-colors">
                          {project.name}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {totals.floorCount} קומות · {totals.itemCount} גופי תאורה
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: project.id, name: project.name });
                        }}
                        className="text-muted-foreground/40 group-hover:text-muted-foreground hover:!text-red-500 transition-all p-2 rounded-lg hover:bg-red-50 shrink-0"
                        aria-label="מחק פרויקט"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">יחידות</p>
                        <p className="text-xl font-bold text-foreground">{totals.totalUnits}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-xs text-amber-600 mb-0.5">סה״כ מחיר לפני מע״מ</p>
                        <p className="text-xl font-bold text-amber-700">₪{totals.totalPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/project/${project.id}/setup`)}
                        className="flex-1 text-xs font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        הגדרות
                      </button>
                      <button
                        onClick={() => router.push(`/project/${project.id}`)}
                        className="flex-1 text-xs font-medium bg-slate-800 text-white rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        פתח פרויקט
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת פרויקט</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את &quot;{deleteTarget?.name}&quot;? פעולה זו אינה הפיכה.
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={() => { deleteProject(deleteTarget!.id); setDeleteTarget(null); }}
              className="flex-1 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              מחק
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
