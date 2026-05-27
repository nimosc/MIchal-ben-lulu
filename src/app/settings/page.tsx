"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { ChevronRight, Settings, Type, Truck, Home, Presentation } from "lucide-react";
import { CatalogTemplateSettings } from "@/components/CatalogTemplateSettings";
import { EditableStringList } from "@/components/EditableStringList";
import { DEFAULT_CATALOG_IMPORTERS } from "@/lib/catalogImporters";
import { DEFAULT_CATALOG_MARKS } from "@/lib/catalogMarks";
import { cn } from "@/lib/utils";

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

const TABS = [
  { id: "marks", label: "אותיות סימון", icon: Type },
  { id: "importers", label: "יבואנים", icon: Truck },
  { id: "rooms", label: "חדרים מהירים", icon: Home },
  { id: "presentation", label: "מצגת קטלוג", icon: Presentation },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

function isSettingsTab(value: string | null): value is SettingsTab {
  return TABS.some((t) => t.id === value);
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : "marks";

  const {
    presetRooms,
    catalogImporters,
    catalogMarks,
    setPresetRooms,
    setCatalogImporters,
    setCatalogMarks,
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [rooms, setRooms] = useState<string[]>(presetRooms);
  const [importers, setImporters] = useState<string[]>(catalogImporters);
  const [marks, setMarks] = useState<string[]>(catalogMarks);

  useEffect(() => {
    setRooms(presetRooms);
    setImporters(catalogImporters);
    setMarks(catalogMarks);
  }, [presetRooms, catalogImporters, catalogMarks]);

  useEffect(() => {
    if (isSettingsTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <section className="min-h-[calc(100vh-56px)] bg-background" dir="rtl">
      <header className="border-b border-border bg-card">
        <section className="max-w-3xl mx-auto px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>חזרה לפרויקטים</span>
          </button>
          <section className="flex items-center gap-3">
            <section className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-500" />
            </section>
            <section>
              <h1 className="text-xl font-bold text-foreground">הגדרות</h1>
              <p className="text-sm text-muted-foreground">
                ניהול רשימות מפרט, חדרים ותבנית מצגת
              </p>
            </section>
          </section>
        </section>
      </header>

      <nav className="border-b border-border bg-card/80 sticky top-14 z-10 backdrop-blur-sm">
        <section className="max-w-3xl mx-auto px-6">
          <div
            role="tablist"
            aria-label="קטגוריות הגדרות"
            className="flex gap-1 overflow-x-auto py-2 -mx-1 px-1 scrollbar-none"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectTab(id)}
                  className={cn(
                    "flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                    selected
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-xs text-muted-foreground mb-6">
          שינויים משפיעים על כל הפרויקטים. אחרי עריכה לחץ «שמור שינויים» בכל טאב.
        </p>

        {activeTab === "marks" && (
          <div role="tabpanel">
            <EditableStringList
              title="אותיות סימון"
              description="הסימונים שמופיעים בשדה «סימון» (D, DW, C...)"
              items={marks}
              onItemsChange={setMarks}
              newItemPlaceholder="סימון חדש — למשל: D7"
              badgeLabel="סימונים"
              onSave={() => setCatalogMarks(marks)}
              onReset={() => setMarks([...DEFAULT_CATALOG_MARKS])}
              normalizeNewItem={(v) => v.toUpperCase()}
              mono
            />
          </div>
        )}

        {activeTab === "importers" && (
          <div role="tabpanel">
            <EditableStringList
              title="יבואנים"
              description="רשימת היבואנים לבחירה במפרט הידני"
              items={importers}
              onItemsChange={setImporters}
              newItemPlaceholder="שם יבואן חדש..."
              badgeLabel="יבואנים"
              onSave={() => setCatalogImporters(importers)}
              onReset={() => setImporters([...DEFAULT_CATALOG_IMPORTERS])}
            />
          </div>
        )}

        {activeTab === "rooms" && (
          <div role="tabpanel">
            <EditableStringList
              title="חדרים מהירים"
              description="חדרים להוספה מהירה בהגדרת קומה"
              items={rooms}
              onItemsChange={setRooms}
              newItemPlaceholder="שם חדר חדש..."
              badgeLabel="חדרים"
              onSave={() => setPresetRooms(rooms)}
              onReset={() => setRooms(DEFAULT_PRESET_ROOMS)}
            />
          </div>
        )}

        {activeTab === "presentation" && (
          <div role="tabpanel">
            <CatalogTemplateSettings />
          </div>
        )}
      </section>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-56px)] bg-background" dir="rtl" />}>
      <SettingsPageContent />
    </Suspense>
  );
}
