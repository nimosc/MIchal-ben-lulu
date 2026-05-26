"use client";

import {
  CATALOG_SPEC_SECTIONS,
  catalogSpecFieldValue,
  setCatalogSpecField,
} from "@/lib/catalogSpecFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScrapedData } from "@/types";

type Props = {
  scraped: ScrapedData;
  onChange: (next: ScrapedData) => void;
};

export function CatalogSpecEditor({ scraped, onChange }: Props) {
  return (
    <div className="border-t border-amber-100 pt-4 space-y-4">
      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
        מפרט לדף קטלוג
      </p>
      {CATALOG_SPEC_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="text-xs font-medium text-foreground/70">{section.title}</p>
          <div className="grid grid-cols-2 gap-2">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs font-medium text-amber-700/60">{field.label}</Label>
                <Input
                  type={field.type}
                  value={catalogSpecFieldValue(scraped, field.key)}
                  onChange={(e) => onChange(setCatalogSpecField(scraped, field.key, e.target.value))}
                  className="h-8 text-sm bg-white border-amber-100 focus-visible:ring-amber-300"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
