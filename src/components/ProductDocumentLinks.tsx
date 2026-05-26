import { FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductDocumentLinks({
  techSpecUrl,
  mountingInstructionsUrl,
  className,
}: {
  techSpecUrl?: string | null;
  mountingInstructionsUrl?: string | null;
  className?: string;
}) {
  if (!techSpecUrl && !mountingInstructionsUrl) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {techSpecUrl && (
        <a
          href={techSpecUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 transition-colors"
        >
          <FileText className="h-4 w-4 shrink-0 text-amber-600" />
          קטלוג טכני
        </a>
      )}
      {mountingInstructionsUrl && (
        <a
          href={mountingInstructionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-slate-600" />
          הוראות התקנה
        </a>
      )}
    </div>
  );
}
