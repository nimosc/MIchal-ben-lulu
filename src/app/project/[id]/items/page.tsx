"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

/** Legacy route — redirect to floors hub or first floor items */
export default function LegacyItemsRedirect() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { projects } = useStore();
  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!project) {
      router.replace("/");
      return;
    }
    const first = [...project.floors].sort((a, b) => a.order - b.order)[0];
    if (first) {
      router.replace(`/project/${projectId}/floor/${first.id}/items`);
    } else {
      router.replace(`/project/${projectId}`);
    }
  }, [project, projectId, router]);

  return null;
}
