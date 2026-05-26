"use client";

import { Fragment, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { calcFloorTotals, calcItemTotals, getFloor } from "@/lib/project";
import { exportFloorToExcel } from "@/lib/exportFloorExcel";
import { exportFloorToPresentation } from "@/lib/exportFloorPresentation";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Send,
  FileDown,
  Settings,
  Zap,
  Package,
  DollarSign,
  Layers,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FloorItemsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const floorId = params.floorId as string;
  const { projects, deleteItem, deleteAccessory } = useStore();
  const project = projects.find((p) => p.id === projectId);
  const floor = project ? getFloor(project, floorId) : undefined;

  const [exporting, setExporting] = useState(false);
  const [exportingPpt, setExportingPpt] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendStatus, setSendStatus] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<
    { type: "item"; itemId: string; label: string } | { type: "accessory"; itemId: string; accId: string; label: string } | null
  >(null);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  if (!project || !floor) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">{!project ? "פרויקט לא נמצא" : "קומה לא נמצאה"}</p>
      </div>
    );
  }

  const floorTotals = calcFloorTotals(floor);
  const { totalUnits, totalPrice, totalWatt } = floorTotals;
  const items = floor.items;

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportFloorToExcel(project, floor);
    } catch {
      alert("שגיאה בייצוא לאקסל");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPresentation = async () => {
    if (items.length === 0) {
      alert("אין גופי תאורה לייצוא");
      return;
    }
    setExportingPpt(true);
    try {
      await exportFloorToPresentation(project, floor);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה בייצוא מצגת";
      alert(msg);
    } finally {
      setExportingPpt(false);
    }
  };

  const handleSendAll = async () => {
    if (!project.webhook_url) {
      alert("לא הוגדר Webhook URL. עדכן בהגדרות פרויקט.");
      return;
    }
    setSending(true);
    setSendProgress(0);
    setSendStatus("");

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { totalUnits, totalPriceExVat, totalWatt } = calcItemTotals(item);
      const payload = {
        project_name: project.name,
        floor_name: floor.name,
        section_id: item.section_id,
        mark: item.mark,
        product_url: item.product_url,
        source: {
          product_name: item.scraped?.product_name ?? null,
          manufacturer: item.scraped?.manufacturer ?? null,
          model: item.scraped?.model ?? null,
          color_temp_k: item.scraped?.color_temp_k ?? null,
          cri: item.scraped?.cri ?? null,
          watt_per_unit: item.scraped?.watt_per_unit ?? null,
          voltage: item.scraped?.voltage ?? null,
          current: item.scraped?.current ?? null,
          max_ceiling_height_cm: item.scraped?.max_ceiling_height_cm ?? null,
          main_image_url: item.scraped?.main_image_url ?? null,
          selected_image_urls:
            item.scraped?.selected_image_urls ??
            (item.scraped?.main_image_url ? [item.scraped.main_image_url] : []),
        },
        manual: {
          driver_location: item.driver_location,
          dimming_method: item.dimming_method,
          body_description: item.body_description,
          unit_type: item.unit_type,
          price_per_unit: item.price_per_unit,
          rooms: item.rooms.map((r) => ({
            room_id: r.room_id,
            room_name: floor.rooms.find((rm) => rm.id === r.room_id)?.name ?? "",
            qty: r.qty,
          })),
        },
        totals: { total_units: totalUnits, total_price_ex_vat: totalPriceExVat, total_watt: totalWatt },
      };

      setSendStatus(`שולח ${i + 1}/${items.length}: ${item.scraped?.product_name ?? (item.body_description || item.mark)}`);
      try {
        await fetch(project.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "no-cors",
        });
      } catch { /* no-cors may throw */ }

      setSendProgress(Math.round(((i + 1) / items.length) * 100));
      if (i < items.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    setSendStatus(`נשלחו ${items.length} גופים בהצלחה ✓`);
    setTimeout(() => { setSending(false); setSendProgress(0); setSendStatus(""); }, 3000);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background" dir="rtl">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <button onClick={() => router.push("/")} className="hover:text-foreground transition-colors">
              פרויקטים
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => router.push(`/project/${projectId}`)} className="hover:text-foreground transition-colors">
              {project.name}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{floor.name}</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-foreground">{floor.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/project/${projectId}/floor/${floorId}/setup`)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                הגדרות
              </button>
              <button
                onClick={() => router.push(`/project/${projectId}/floor/${floorId}/item`)}
                className="flex items-center gap-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                הוסף גוף תאורה
              </button>
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
                disabled={exporting || exportingPpt || items.length === 0}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary hover:text-foreground disabled:opacity-60 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                {exportingPpt ? "מייצא מצגת..." : "ייצוא מצגת"}
              </button>
              {items.length > 0 && (
                <button
                  onClick={handleSendAll}
                  disabled={sending}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  שלח ל-Make
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1.5">
                <Layers className="w-3.5 h-3.5" /> גופי תאורה
              </div>
              <p className="text-2xl font-bold text-foreground">{items.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1.5">
                <Package className="w-3.5 h-3.5" /> סה״כ יחידות
              </div>
              <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1.5">
                <DollarSign className="w-3.5 h-3.5" /> סה״כ מחיר
              </div>
              <p className="text-2xl font-bold text-amber-700">₪{totalPrice.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1.5">
                <Zap className="w-3.5 h-3.5" /> צריכת חשמל
              </div>
              <p className="text-2xl font-bold text-foreground">
                {totalWatt}<span className="text-sm font-normal text-muted-foreground">W</span>
              </p>
            </div>
          </div>
        )}

        {/* Send progress */}
        {sending && (
          <div className="bg-slate-800 text-white rounded-xl p-4">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-300">{sendStatus}</span>
              <span className="font-bold tabular-nums">{sendProgress}%</span>
            </div>
            <Progress value={sendProgress} className="h-1.5 bg-slate-700 [&>div]:bg-amber-400" />
          </div>
        )}

        {/* Table */}
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">אין גופי תאורה</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">הוסף את גוף התאורה הראשון לפרויקט</p>
            <button
              onClick={() => router.push(`/project/${projectId}/floor/${floorId}/item`)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              הוסף גוף תאורה
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border">
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">סעיף</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">סימון</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">מוצר</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">תיאור</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">חדרים</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">יח׳</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">מחיר</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">שליטה</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">נתונים</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const { totalUnits, totalPriceExVat, totalWatt } = calcItemTotals(item);
                    const accessories = item.accessories ?? [];
                    const isExpanded = expandedItems.has(item.id);
                    return (
                      <Fragment key={item.id}>
                      <tr
                        className={`hover:bg-secondary/40 transition-colors ${idx % 2 !== 0 ? "bg-secondary/20" : ""}`}
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded-md">{item.section_id}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-amber-600 text-base">{item.mark}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px]">
                          {item.scraped?.product_name ? (
                            <div>
                              <p className="font-semibold text-foreground truncate">{item.scraped.product_name}</p>
                              {item.scraped.manufacturer && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.scraped.manufacturer}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {item.product_url ? (
                                <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="underline decoration-dashed truncate block max-w-[180px] hover:text-foreground transition-colors">
                                  {item.product_url}
                                </a>
                              ) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground max-w-[150px] truncate">
                          {item.body_description || "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {item.rooms.map((r) => {
                              const room = floor.rooms.find((rm) => rm.id === r.room_id);
                              return (
                                <span key={r.room_id} className="tag text-xs">
                                  {room?.name ?? r.room_id} <span className="text-muted-foreground">×{r.qty}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">{totalUnits}</td>
                        <td className="px-4 py-3.5 font-semibold text-amber-600">₪{totalPriceExVat.toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <span className="tag text-xs">{item.dimming_method}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            {item.scraped_status === "done" && item.scraped?.product_name
                              ? <span className="tag-amber text-xs">אוטומטי</span>
                              : <span className="tag text-xs text-muted-foreground">ידני</span>
                            }
                            {item.scraped?.watt_per_unit ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Zap className="w-3 h-3" />{totalWatt}W
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => toggleExpand(item.id)}
                              title="אביזרים"
                              className={`p-2 min-w-[36px] min-h-[36px] rounded-lg transition-colors flex items-center justify-center ${accessories.length > 0 ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                            >
                              <div className="flex items-center gap-0.5">
                                <Wrench className="w-3.5 h-3.5" />
                                {accessories.length > 0 && (
                                  <span className="text-[10px] font-bold">{accessories.length}</span>
                                )}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                            </button>
                            <button
                              onClick={() => router.push(`/project/${projectId}/floor/${floorId}/item?edit=${item.id}`)}
                              className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
                              aria-label="ערוך גוף"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setPendingDelete({ type: "item", itemId: item.id, label: item.scraped?.product_name || item.body_description || item.mark })}
                              className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                              aria-label="מחק גוף"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${item.id}-accessories`}>
                          <td colSpan={10} className="px-0 py-0 bg-amber-50/40">
                            <div className="px-6 py-3 border-t border-amber-100 space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                                  <Wrench className="w-3.5 h-3.5" />
                                  אביזרים לגוף {item.mark}
                                </span>
                                <button
                                  onClick={() => router.push(`/project/${projectId}/floor/${floorId}/item/${item.id}/accessory`)}
                                  className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  הוסף אביזר
                                </button>
                              </div>
                              {accessories.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">אין אביזרים עדיין</p>
                              ) : (
                                <div className="space-y-1">
                                  {accessories.map((acc) => {
                                    const accUnits = acc.rooms.reduce((s, r) => s + r.qty, 0);
                                    const accPrice = accUnits * acc.price_per_unit;
                                    const accLabel = acc.scraped?.product_name || acc.body_description || "אביזר";
                                    return (
                                      <div key={acc.id} className="flex items-center gap-3 bg-white border border-amber-100 rounded-xl px-3 py-2.5">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">{accLabel}</p>
                                          {acc.scraped?.manufacturer && (
                                            <p className="text-xs text-muted-foreground">{acc.scraped.manufacturer}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                          {accUnits > 0 && (
                                            <span className="flex items-center gap-0.5">
                                              <Package className="w-3 h-3" />{accUnits} {acc.unit_type}
                                            </span>
                                          )}
                                          {accPrice > 0 && (
                                            <span className="font-semibold text-amber-600">₪{accPrice.toLocaleString()}</span>
                                          )}
                                          {acc.product_url && (
                                            <a href={acc.product_url} target="_blank" rel="noopener noreferrer"
                                              className="text-muted-foreground hover:text-foreground transition-colors"
                                              title="פתח קישור">
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                              </svg>
                                            </a>
                                          )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                          <button
                                            onClick={() => router.push(`/project/${projectId}/floor/${floorId}/item/${item.id}/accessory?edit=${acc.id}`)}
                                            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
                                            aria-label="ערוך אביזר"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setPendingDelete({ type: "accessory", itemId: item.id, accId: acc.id, label: accLabel })}
                                            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                                            aria-label="מחק אביזר"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-secondary/40 px-5 py-3.5 flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <span className="text-muted-foreground">גופים: <strong className="text-foreground">{items.length}</strong></span>
              <span className="text-muted-foreground">יחידות: <strong className="text-foreground">{totalUnits}</strong></span>
              <span className="text-muted-foreground">מחיר: <strong className="text-amber-600">₪{totalPrice.toLocaleString()}</strong></span>
              <span className="text-muted-foreground">חשמל: <strong className="text-foreground">{totalWatt}W</strong></span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{pendingDelete?.type === "accessory" ? "מחיקת אביזר" : "מחיקת גוף תאורה"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את &quot;{pendingDelete?.label}&quot;? פעולה זו אינה הפיכה.
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <button
              onClick={() => setPendingDelete(null)}
              className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={() => {
                if (!pendingDelete) return;
                if (pendingDelete.type === "item") {
                  deleteItem(projectId, floorId, pendingDelete.itemId);
                } else {
                  deleteAccessory(projectId, floorId, pendingDelete.itemId, pendingDelete.accId);
                }
                setPendingDelete(null);
              }}
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
