import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/components/CatalogTemplateSettings.tsx"
);

const content = `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
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
      showMsg("ok", "התבנית הורדה");
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : "הורדה נכשלה");
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
      showMsg("ok", "התבנית הועלתה ותשמש בייצוא הבא");
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleReset = async () => {
    if (!confirm("לחזור לתבנית ברירת המחדל מהאתר?")) return;
    setBusy(true);
    try {
      await clearCatalogTemplateOverride();
      await refresh();
      showMsg("ok", "חזרה לתבנית ברירת המחדל");
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : "איפוס נכשל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <motion className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
`;

fs.writeFileSync(out, content);
console.log("partial - fix manually");
