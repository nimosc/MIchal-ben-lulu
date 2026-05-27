"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
        "outline-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  );
}

export function ImporterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { catalogImporters, addCatalogImporter } = useStore();
  const [newImporter, setNewImporter] = useState("");

  const handleAdd = () => {
    const added = addCatalogImporter(newImporter);
    if (!added) return;
    onChange(added);
    setNewImporter("");
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">יבואן</Label>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {catalogImporters.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <div className="flex gap-2">
        <Input
          placeholder="יבואן חדש..."
          value={newImporter}
          onChange={(e) => setNewImporter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="h-9 flex-1 text-sm"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!newImporter.trim()}
          size="sm"
          className="h-9 shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          הוסף
        </Button>
      </div>
    </div>
  );
}
