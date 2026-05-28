"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { calcFloorTotals, calcProjectTotals } from "@/lib/project";
import { exportProjectToExcel } from "@/lib/exportFloorExcel";
import { CatalogPresentationPreviewDialog } from "@/components/CatalogPresentationPreviewDialog";
import type { CatalogPresentationPreviewState } from "@/lib/catalogPresentationPreview";
import { prepareProjectPresentation } from "@/lib/exportProjectPresentation";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  Plus,
  Trash2,
  Building2,
  Layers,
  Settings,
  FileDown,
  ArrowRight,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FLOOR_PRESETS = ["קומת קרקע", "קומה 1", "קומה 2", "קומה 3", "מרתף", "גג"];

export default function ProjectFloorsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { projects, addFloor, deleteFloor, updateFloor } = useStore();
  const project = projects.find((p) => p.id === projectId);

  const [newFloorName, setNewFloorName] = useState("");
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPpt, setExportingPpt] = useState(false);
  const [pptPreviewOpen, setPptPreviewOpen] = useState(false);
  const [pptPreview, setPptPreview] = useState<CatalogPresentationPreviewState | null>(null);
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<{ id: string; name: string } | null>(null);
  const [lastFloorAlert, setLastFloorAlert] = useState(false);
  const [renameFloorTarget, setRenameFloorTarget] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">פרויקט לא נמצא</p>
      </div>
    );
  }

  const totals = calcProjectTotals(project);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportProjectToExcel(project);
    } catch {
      alert("שגיאה בייצוא לאקסל");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPresentation = async () => {
    if (totals.itemCount === 0) {
      alert("אין גופי תאורה לייצוא");
      return;
    }
    setPptPreviewOpen(true);
    setPptPreview(null);
    setExportingPpt(true);
    try {
      const result = await prepareProjectPresentation(project);
      setPptPreview(result);
    } catch (e) {
      setPptPreviewOpen(false);
      const msg = e instanceof Error ? e.message : "שגיאה בייצוא מצגת";
      alert(msg);
    } finally {
      setExportingPpt(false);
    }
  };

  const handleAddFloor = () => {
    const name = newFloorName.trim();
    if (!name) return;
    const newFloorId = addFloor(projectId, name);
    setNewFloorName("");
    setAdding(false);
    router.push(`/project/${projectId}/floor/${newFloorId}/setup?addRoom=1`);
  };

  const startRenameFloor = (floorId: string, currentName: string) => {
    setRenameFloorTarget(floorId);
    setRenameDraft(currentName);
  };

  const cancelRenameFloor = () => {
    setRenameFloorTarget(null);
    setRenameDraft("");
  };

  const commitRenameFloor = (floorId: string) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    updateFloor(projectId, floorId, { name: trimmed });
    cancelRenameFloor();
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background" dir="rtl">
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <button onClick={() => router.push("/")} className="hover:text-foreground transition-colors">
              פרויקטים
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{project.name}</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totals.floorCount} קומות · {totals.itemCount} גופי תאורה
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportExcel}
                disabled={exporting || exportingPpt}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary hover:text-foreground disabled:opacity-60 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                {exporting ? "מייצא..." : "ייצוא לאקסל"}
              </button>
              <button
                onClick={handleExportPresentation}
                disabled={exporting || exportingPpt || totals.itemCount === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary hover:text-foreground disabled:opacity-60 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                {exportingPpt ? "מייצא מצגת..." : "ייצוא מצגת"}
              </button>
              <button
                onClick={() => router.push(`/project/${projectId}/setup`)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                הגדרות פרויקט
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-foreground">קומות</h2>
          {adding ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="שם קומה..."
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFloor();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewFloorName("");
                  }
                }}
                autoFocus
                className="h-9 w-44"
              />
              <button
                onClick={handleAddFloor}
                disabled={!newFloorName.trim()}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-medium px-3 py-2 rounded-lg"
              >
                הוסף
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewFloorName("");
                }}
                className="text-sm text-muted-foreground px-2"
              >
                ביטול
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              קומה חדשה
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {FLOOR_PRESETS.map((name) => {
            const exists = project.floors.some((f) => f.name === name);
            return (
              <button
                key={name}
                type="button"
                disabled={exists}
                onClick={() => {
                  const newFloorId = addFloor(projectId, name);
                  router.push(`/project/${projectId}/floor/${newFloorId}/setup?addRoom=1`);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  exists
                    ? "bg-amber-50 border-amber-200 text-amber-400 cursor-default"
                    : "bg-secondary border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
                }`}
              >
                {exists ? `✓ ${name}` : `+ ${name}`}
              </button>
            );
          })}
        </div>

        {project.floors.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-20 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">אין קומות</h3>
            <p className="text-sm text-muted-foreground mb-4">הוסף קומה כדי להתחיל לנהל גופי תאורה</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...project.floors]
              .sort((a, b) => a.order - b.order)
              .map((floor) => {
                const ft = calcFloorTotals(floor);
                return (
                  <div
                    key={floor.id}
                    className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer"
                    onClick={() => router.push(`/project/${projectId}/floor/${floor.id}/items`)}
                  >
                    <div className="h-1.5 bg-gradient-to-l from-slate-600 to-slate-800" />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0 flex-1">
                          {renameFloorTarget === floor.id ? (
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Input
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRenameFloor(floor.id);
                                  if (e.key === "Escape") cancelRenameFloor();
                                }}
                                className="h-8 text-sm font-semibold w-48"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  commitRenameFloor(floor.id);
                                }}
                                className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                                aria-label="שמור שם קומה"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelRenameFloor();
                                }}
                                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                                aria-label="ביטול עריכת שם קומה"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-bold text-lg text-foreground group-hover:text-amber-600 transition-colors truncate">
                              {floor.name}
                            </h3>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ft.itemCount} גופים · {floor.rooms.length} חדרים
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (project.floors.length <= 1) {
                              setLastFloorAlert(true);
                              return;
                            }
                            setDeleteFloorTarget({ id: floor.id, name: floor.name });
                          }}
                          className="text-muted-foreground/40 group-hover:text-muted-foreground hover:!text-red-500 transition-all p-2 rounded-lg hover:bg-red-50 shrink-0"
                          aria-label="מחק קומה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRenameFloor(floor.id, floor.name);
                          }}
                          className="text-muted-foreground/40 group-hover:text-muted-foreground hover:text-amber-600 transition-all p-2 rounded-lg hover:bg-secondary shrink-0"
                          aria-label="עריכת שם קומה"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-secondary rounded-xl p-3">
                          <p className="text-xs text-muted-foreground">יחידות</p>
                          <p className="text-lg font-bold">{ft.totalUnits}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-xs text-amber-600">מחיר לפני מע״מ</p>
                          <p className="text-lg font-bold text-amber-700">₪{ft.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => router.push(`/project/${projectId}/floor/${floor.id}/setup`)}
                          className="flex-1 text-xs font-medium border border-border rounded-lg py-2 hover:bg-secondary flex items-center justify-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          חדרים
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/project/${projectId}/floor/${floor.id}/items`)}
                          className="flex-1 text-xs font-medium bg-slate-800 text-white rounded-lg py-2 hover:bg-slate-700 flex items-center justify-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          גופים
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {totals.itemCount > 0 && (
          <div className="mt-8 p-4 bg-secondary/50 rounded-xl flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              סה״כ פרויקט: <strong className="text-foreground">{totals.itemCount}</strong> גופים
            </span>
            <span>
              יחידות: <strong className="text-foreground">{totals.totalUnits}</strong>
            </span>
            <span>
              מחיר לפני מע״מ: <strong className="text-amber-600">₪{totals.totalPrice.toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Delete floor confirmation */}
      <Dialog open={deleteFloorTarget !== null} onOpenChange={(open) => { if (!open) setDeleteFloorTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת קומה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את &quot;{deleteFloorTarget?.name}&quot; וכל הגופים שבה? פעולה זו אינה הפיכה.
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <button
              onClick={() => setDeleteFloorTarget(null)}
              className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={() => { deleteFloor(projectId, deleteFloorTarget!.id); setDeleteFloorTarget(null); }}
              className="flex-1 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              מחק
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogPresentationPreviewDialog
        open={pptPreviewOpen}
        onOpenChange={setPptPreviewOpen}
        loading={exportingPpt}
        preview={pptPreview}
      />

      {/* Last floor alert */}
      <Dialog open={lastFloorAlert} onOpenChange={setLastFloorAlert}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>לא ניתן למחוק</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">לא ניתן למחוק את הקומה האחרונה בפרויקט.</p>
          <DialogFooter className="mt-2">
            <button
              onClick={() => setLastFloorAlert(false)}
              className="w-full py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              סגור
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
