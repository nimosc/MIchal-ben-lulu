"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialize = useStore((s) => s.initialize);
  const isLoaded = useStore((s) => s.isLoaded);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
