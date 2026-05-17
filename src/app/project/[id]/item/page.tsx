"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";

function LegacyItemRedirectInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const editId = searchParams.get("edit");
  const { projects } = useStore();
  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!project) {
      router.replace("/");
      return;
    }
    const first = [...project.floors].sort((a, b) => a.order - b.order)[0];
    if (!first) {
      router.replace(`/project/${projectId}`);
      return;
    }
    const q = editId ? `?edit=${editId}` : "";
    router.replace(`/project/${projectId}/floor/${first.id}/item${q}`);
  }, [project, projectId, editId, router]);

  return null;
}

export default function LegacyItemRedirect() {
  return (
    <Suspense fallback={null}>
      <LegacyItemRedirectInner />
    </Suspense>
  );
}
