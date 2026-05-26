"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ALL_TEMPLATE_VARIABLES,
  CATALOG_TEMPLATE_FIELD_GUIDE,
  CATALOG_TEMPLATE_REQUIREMENTS,
} from "@/lib/catalogTemplateFields";
import {
  formatTemplateSize,
  type CatalogTemplateMeta,
} from "@/lib/catalogTemplateStorage";
import {
  clearCatalogTemplateOverride,
  downloadCatalogTemplate,
  getActiveCatalogTemplateMeta,
  uploadCatalogTemplate,
} from "@/lib/loadCatalogTemplate";
import { Download, FileUp, RotateCcw, Presentation } from "lucide-react";

const MSG = {
  downloaded: "\u05d4\u05ea\u05d1\u05e0\u05d9\u05ea \u05d4\u05d5\u05e8\u05d3\u05d4",
  downloadFail: "\u05d4\u05d5\u05e8\u05d3\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4",
  uploaded: "\u05d4\u05ea\u05d1\u05e0\u05d9\u05ea \u05d4\u05d5\u05e2\u05dc\u05ea\u05d4 \u05d5\u05ea\u05e9\u05de\u05e9 \u05d1\u05d9\u05d9\u05e6\u05d5\u05d0 \u05d4\u05d1\u05d0",
  uploadFail: "\u05d4\u05e2\u05dc\u05d0\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4",
  resetConfirm:
    "\u05dc\u05d7\u05d6\u05d5\u05e8 \u05dc\u05ea\u05d1\u05e0\u05d9\u05ea \u05d1\u05e8\u05d9\u05e8\u05ea \u05d4\u05de\u05d7\u05d3\u05dc \u05de\u05d4\u05d0\u05ea\u05e8?",
  resetOk: "\u05d7\u05d6\u05e8\u05d4 \u05dc\u05ea\u05d1\u05e0\u05d9\u05ea \u05d1\u05e8\u05d9\u05e8\u05ea \u05d4\u05de\u05d7\u05d3\u05dc",
  resetFail: "\u05d0\u05d9\u05e4\u05d5\u05e1 \u05e0\u05db\u05e9\u05dc",
} as const;

export function CatalogTemplateSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"override" | "default">("default");
  const [meta, setMeta] = useState<CatalogTemplateMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const active = await getActiveCatalogTemplateMeta();
      setSource(active.source);
      setMeta(active.meta);
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

  const handleDownload = async () => {
    setBusy(true);
    try {
      await downloadCatalogTemplate();
      showMsg("ok", MSG.downloaded);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.downloadFail);
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const saved = await uploadCatalogTemplate(file);
      setSource("override");
      setMeta(saved);
      showMsg("ok", MSG.uploaded);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.uploadFail);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleReset = async () => {
    if (!confirm(MSG.resetConfirm)) return;
    setBusy(true);
    try {
      await clearCatalogTemplateOverride();
      await refresh();
      showMsg("ok", MSG.resetOk);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : MSG.resetFail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <section className="flex items-center gap-3 min-w-0">
            <section className="w-9 h-9 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
              <Presentation className="w-4 h-4 text-violet-600" />
            </section>
            <section>
              <h2 className="font-semibold text-foreground">
                {"\u05ea\u05d1\u05e0\u05d9\u05ea \u05de\u05e6\u05d2\u05ea \u05e7\u05d8\u05dc\u05d5\u05d2 (PPTX)"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {
                  "\u05d4\u05d5\u05e8\u05d3\u05d4, \u05d4\u05e2\u05dc\u05d0\u05d4 \u05d5\u05d0\u05d9\u05e4\u05d5\u05e1 \u2014 \u05e0\u05e9\u05de\u05e8 \u05d1\u05d3\u05e4\u05d3\u05e4\u05df (IndexedDB)"
                }
              </p>
            </section>
          </section>
          {!loading && (
            <span
              className={
                source === "override"
                  ? "tag-amber shrink-0"
                  : "text-xs px-2 py-1 rounded-lg bg-secondary text-muted-foreground shrink-0"
              }
            >
              {source === "override"
                ? "\u05ea\u05d1\u05e0\u05d9\u05ea \u05de\u05d5\u05ea\u05d0\u05de\u05ea"
                : "\u05d1\u05e8\u05d9\u05e8\u05ea \u05de\u05d7\u05d3\u05dc"}
            </span>
          )}
        </header>

        <section className="p-6 space-y-4">
          {source === "override" && meta && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{meta.filename}</span>
              {" \u00b7 "}
              {formatTemplateSize(meta.size)}
              {" \u00b7 "}
              {"\u05e2\u05d5\u05d3\u05db\u05df "}
              {new Date(meta.uploadedAt).toLocaleString("he-IL")}
            </p>
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

          <section className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || loading}
              onClick={() => void handleDownload()}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {"\u05d4\u05d5\u05e8\u05d3 \u05ea\u05d1\u05e0\u05d9\u05ea"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || loading}
              onClick={() => inputRef.current?.click()}
              className="gap-2"
            >
              <FileUp className="w-4 h-4" />
              {"\u05d4\u05e2\u05dc\u05d4 \u05ea\u05d1\u05e0\u05d9\u05ea (.pptx)"}
            </Button>
            {source === "override" && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy || loading}
                onClick={() => void handleReset()}
                className="gap-2 text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4" />
                {"\u05d0\u05d9\u05e4\u05d5\u05e1 \u05dc\u05d1\u05e8\u05d9\u05e8\u05ea \u05de\u05d7\u05d3\u05dc"}
              </Button>
            )}
          </section>
          <input
            ref={inputRef}
            type="file"
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
          />
        </section>
      </section>

      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <header className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {"\u05e9\u05d3\u05d5\u05ea \u05e9\u05e0\u05d9\u05ea\u05df \u05dc\u05de\u05dc\u05d0 \u05d1\u05ea\u05d1\u05e0\u05d9\u05ea"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {
              "\u05d4\u05d9\u05d9\u05e6\u05d5\u05d0 \u05de\u05d7\u05dc\u05d9\u05e3 \u05d8\u05e7\u05e1\u05d8\u05d9\u05dd \u05d5\u05d8\u05d1\u05dc\u05d0\u05d5\u05ea \u05dc\u05e4\u05d9 \u05d4\u05e9\u05d3\u05d5\u05ea \u05d1\u05de\u05d8\u05d4. \u05e9\u05de\u05e8\u05d5 \u05e2\u05dc \u05de\u05d1\u05e0\u05d4 \u05d4\u05ea\u05d1\u05e0\u05d9\u05ea \u05d4\u05de\u05e7\u05d5\u05e8\u05d9."
            }
          </p>
        </header>
        <section className="px-6 py-4 border-b border-border bg-secondary/30">
          <p className="text-xs font-medium text-foreground mb-2">
            {"\u05d3\u05e8\u05d9\u05e9\u05d5\u05ea \u05ea\u05d1\u05e0\u05d9\u05ea"}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            {CATALOG_TEMPLATE_REQUIREMENTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-xs font-medium text-foreground mt-4 mb-2">
            {"\u05e8\u05e9\u05d9\u05de\u05ea \u05de\u05e9\u05ea\u05e0\u05d9\u05dd \u05d6\u05de\u05d9\u05e0\u05d9\u05dd"}
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
                      <th className="text-right py-2 pl-4 font-medium">
                        {"\u05e9\u05d3\u05d4"}
                      </th>
                      <th className="text-right py-2 pl-4 font-medium">
                        {"\u05de\u05e7\u05d5\u05e8 \u05d1\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd"}
                      </th>
                      <th className="text-right py-2 font-medium">
                        {"\u05d1\u05ea\u05d1\u05e0\u05d9\u05ea"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.fields.map((f) => (
                      <tr key={f.label} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pl-4 font-medium text-foreground align-top whitespace-nowrap">
                          {f.label}
                        </td>
                        <td className="py-2 pl-4 text-muted-foreground align-top">{f.source}</td>
                        <td className="py-2 text-muted-foreground align-top text-xs">
                          {f.templateAnchor ?? "\u2014"}
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
      </section>
    </section>
  );
}
