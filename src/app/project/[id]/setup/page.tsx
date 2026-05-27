"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Link, Save, Settings } from "lucide-react";

export default function ProjectSetupPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { projects, updateProject } = useStore();
  const project = projects.find((p) => p.id === projectId);

  const [webhookUrl, setWebhookUrl] = useState(project?.webhook_url ?? "");
  const [projectName, setProjectName] = useState(project?.name ?? "");

  useEffect(() => {
    if (!project) return;
    setWebhookUrl(project.webhook_url ?? "");
    setProjectName(project.name ?? "");
  }, [project]);

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">פרויקט לא נמצא</p>
      </div>
    );
  }

  const handleSave = () => {
    const trimmedName = projectName.trim();
    if (!trimmedName) return;
    updateProject(projectId, { name: trimmedName, webhook_url: webhookUrl });
    router.push(`/project/${projectId}`);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background" dir="rtl">
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <button onClick={() => router.push("/")} className="hover:text-foreground transition-colors">
              פרויקטים
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => router.push(`/project/${projectId}`)} className="hover:text-foreground transition-colors">
              {project.name}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">הגדרות</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">הגדרות פרויקט</h1>
              <p className="text-sm text-muted-foreground">{projectName || project.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Link className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">שם פרויקט</h2>
          </div>
          <div className="p-6">
            <Input
              placeholder="שם הפרויקט..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="font-mono text-sm h-10"
              dir="rtl"
            />
            <p className="text-xs text-muted-foreground mt-2">
              משמש גם לחלק מהתבניות והייצוא.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Link className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">חיבור Make (Webhook)</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              כתובת Webhook לשליחת גופי תאורה מכל הקומות בפרויקט
            </p>
            <Input
              placeholder="https://hook.eu1.make.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono text-sm h-10"
              dir="ltr"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          חדרים מוגדרים לכל קומה בנפרד — מהדף של הקומה לחץ &quot;חדרים&quot;.
        </p>

        <Button
          onClick={handleSave}
          className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white font-semibold gap-2 rounded-xl"
        >
          <Save className="w-4 h-4" />
          שמור
        </Button>
      </div>
    </div>
  );
}
