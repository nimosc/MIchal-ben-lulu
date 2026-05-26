"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialize = useStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
