"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { deleteReport } from "@/app/logs/actions";
import { Button } from "@/components/ui/button";

export function DeleteReportButton({
  reportId,
  reportLabel,
  pendingApproval = false,
  disabled = false,
  onDeleted,
}: {
  reportId: string;
  reportLabel: string;
  pendingApproval?: boolean;
  disabled?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();

    const approvalNote = pendingApproval
      ? " Any pending email approval link for this report will stop working."
      : "";
    const ok = window.confirm(
      `Delete report from ${reportLabel}? This cannot be undone.${approvalNote}`
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteReport(reportId);
        onDeleted?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete report.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={disabled || pending}
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-1.5 h-4 w-4" />
        )}
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
