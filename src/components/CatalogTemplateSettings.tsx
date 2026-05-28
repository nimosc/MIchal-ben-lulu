"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  ALL_TEMPLATE_VARIABLES,
  CATALOG_TEMPLATE_FIELD_GUIDE,
  CATALOG_TEMPLATE_REQUIREMENTS,
} from "@/lib/catalogTemplateFields";
import {
  CATALOG_TEMPLATE_CONFIG,
  CATALOG_TEMPLATE_KINDS,
  type CatalogTemplateKind,
} from "@/lib/catalogTemplateTypes";
import {
  formatTemplateSize,
  type CatalogTemplateMeta,
} from "@/lib/catalogTemplateStorage";
import {
  clearCatalogTemplateOverride,
  downloadCatalogTemplate,
  getActiveCatalogTemplatesMeta,
  uploadCatalogTemplate,
} from "@/lib/loadCatalogTemplate";
import {
  Download,
  FileUp,
  RotateCcw,
  Presentation,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

const MSG = {
  downloaded: "התבנית הורדה",
  downloadFail: "הורדה נכשלה",
  uploaded: "התבנית הועלתה ותשמש בייצוא הבא",
  uploadFail: "העלאה נכשלה",
  resetConfirm: "לאפס את התבנית המותאמת לברירת מחדל?",
  resetOk: "חזרה לברירת מחדל",
  resetFail: "איפוס נכשל",
  resetAllConfirm: "לאפס את כל התבניות המותאמות לברירת מחדל?",
} as const;

function TemplateKindCard({
  kind,
  meta,
  source,
  disabled,
  onDownload,
  onUpload,
  onReset,
}: {
  kind: CatalogTemplateKind;
  meta: CatalogTemplateMeta | null;
  source: "override" | "default";
  disabled: boolean;
  onDownload: () => void;
  onUpload: (file: File) => void;
  onReset: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cfg = CATALOG_TEMPLATE_CONFIG[kind];

  return (
    <article className="border border-border rounded-xl p-4 bg-secondary/20 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{cfg.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
        </div>
        <span
          className={
            source === "override"
              ? "tag-amber shrink-0 text-[10px]"
              : "text-[10px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground shrink-0"
          }
        >
          {source === "override" ? "מותאם" : "ברירת מחדל"}
        </span>
      </div>

      {meta && source === "override" && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{meta.filename}</span>
          {" · "}
          {formatTemplateSize(meta.size)}
          {" · "}
          {new Date(meta.uploadedAt).toLocaleString("he-IL")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onDownload}
          className="gap-1.5 h-8"
        >
          <Download className="w-3.5 h-3.5" />
          הורד
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5 h-8"
        >
          <FileUp className="w-3.5 h-3.5" />
          העלה
        </Button>
        {source === "override" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onReset}
            className="gap-1.5 h-8 text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            איפוס
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </article>
  );
}

export function CatalogTemplateSettings() {
  const [sources, setSources] = useState<
    Partial<Record<CatalogTemplateKind, "override" | "default">>
  >({});
  const [metas, setMetas] = useState<Partial<Record<CatalogTemplateKind, CatalogTemplateMeta>>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<CatalogTemplateKind | "all" | null>(null);
  const [uploadingKind, setUploadingKind] = useState<CatalogTemplateKind | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fieldsExpanded, setFieldsExpanded] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const active = await getActiveCatalogTemplatesMeta();
      setSources(active.sources);
      setMetas(active.metas);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDownload = async (kind: CatalogTemplateKind) => {
    setBusyKind(kind);
    try {
      await downloadCatalogTemplate(kind);
      showMsg("ok", MSG.downloaded);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.downloadFail);
    } finally {
      setBusyKind(null);
    }
  };

  const handleUpload = async (kind: CatalogTemplateKind, file: File) => {
    flushSync(() => {
      setUploadingKind(kind);
      setMessage(null);
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const saved = await uploadCatalogTemplate(kind, file);
      setMetas((prev) => ({ ...prev, [kind]: saved }));
      setSources((prev) => ({ ...prev, [kind]: "override" }));
      showMsg("ok", MSG.uploaded);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.uploadFail);
    } finally {
      setUploadingKind(null);
    }
  };

  const handleReset = async (kind: CatalogTemplateKind) => {
    if (!confirm(MSG.resetConfirm)) return;
    setBusyKind(kind);
    try {
      await clearCatalogTemplateOverride(kind);
      await refresh();
      showMsg("ok", MSG.resetOk);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.resetFail);
    } finally {
      setBusyKind(null);
    }
  };

  const handleResetAll = async () => {
    if (!confirm(MSG.resetAllConfirm)) return;
    setBusyKind("all");
    try {
      await clearCatalogTemplateOverride();
      await refresh();
      showMsg("ok", MSG.resetOk);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.resetFail);
    } finally {
      setBusyKind(null);
    }
  };

  const anyOverride = CATALOG_TEMPLATE_KINDS.some((k) => sources[k] === "override");
  const globalDisabled = loading || uploadingKind !== null || busyKind !== null;

  return (
    <section className="space-y-6">
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <section className="flex items-center gap-3 min-w-0">
            <section className="w-9 h-9 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
              <Presentation className="w-4 h-4 text-violet-600" />
            </section>
            <section>
              <h2 className="font-semibold text-foreground">תבניות מצגת קטלוג (PPTX)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                4 קבצים. מוצר עם 3 תמונות → העלה תבנית «3 תמונות (2 שקפים)» (slide1+slide2 באותו PPTX).
              </p>
            </section>
          </section>
          {anyOverride && !loading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={globalDisabled}
              onClick={() => void handleResetAll()}
              className="gap-1.5 text-muted-foreground shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              איפוס הכל
            </Button>
          )}
        </header>

        <section className="p-6 space-y-4">
          {uploadingKind && (
            <div
              className="flex items-center gap-2 text-violet-600 text-sm"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              מעלה {CATALOG_TEMPLATE_CONFIG[uploadingKind].label}...
            </div>
          )}

          {message && (
            <p
              className={`text-sm rounded-lg px-3 py-2 ${
                message.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {CATALOG_TEMPLATE_KINDS.map((kind) => (
              <TemplateKindCard
                key={kind}
                kind={kind}
                meta={metas[kind] ?? null}
                source={sources[kind] ?? "default"}
                disabled={globalDisabled || busyKind === kind || busyKind === "all"}
                onDownload={() => void handleDownload(kind)}
                onUpload={(file) => void handleUpload(kind, file)}
                onReset={() => void handleReset(kind)}
              />
            ))}
          </div>
        </section>
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <header
          className="px-6 py-4 border-b border-border flex items-center justify-between cursor-pointer select-none"
          onClick={() => setFieldsExpanded((v) => !v)}
        >
          <div>
            <h2 className="font-semibold text-foreground">שדות שניתן למלא בתבנית</h2>
            <p className="text-xs text-muted-foreground mt-1">
              הייצוא מחליף טקסטים וטבלאות לפי השדות במטה. שמרו על מבנה התבנית המקורי.
            </p>
          </div>
          {fieldsExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </header>
        {fieldsExpanded && (
          <>
            <section className="px-6 py-4 border-b border-border bg-secondary/30">
              <p className="text-xs font-medium text-foreground mb-2">דרישות תבנית</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                {CATALOG_TEMPLATE_REQUIREMENTS.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="text-xs font-medium text-foreground mt-4 mb-2">
                רשימת משתנים זמינים
              </p>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed break-all">
                {ALL_TEMPLATE_VARIABLES.join(" ")}
              </p>
            </section>
            <section className="divide-y divide-border">
              {CATALOG_TEMPLATE_FIELD_GUIDE.map((section) => (
                <article key={section.title} className="px-6 py-5">
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  {section.description && (
                    <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                  )}
                  <section className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border">
                          <th className="text-right py-2 pl-4 font-medium">שדה</th>
                          <th className="text-right py-2 pl-4 font-medium">מקור בנתונים</th>
                          <th className="text-right py-2 font-medium">בתבנית</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.fields.map((f) => (
                          <tr key={f.label} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pl-4 font-medium text-foreground align-top whitespace-nowrap">
                              {f.label}
                            </td>
                            <td className="py-2 pl-4 text-muted-foreground align-top">
                              {f.source}
                            </td>
                            <td className="py-2 text-muted-foreground align-top text-xs">
                              {f.templateAnchor ?? "—"}
                              {f.notes && (
                                <span className="block text-muted-foreground/80 mt-0.5">
                                  {f.notes}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </section>
  );
}
