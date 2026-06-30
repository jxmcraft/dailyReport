"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";

import { sendReportEmail } from "@/app/agents/[id]/actions";
import { Button } from "@/components/ui/button";
import type { EmailDeliveryStatus } from "@/lib/agents";

function confirmMessage(
  reportLabel: string,
  emailDeliveryStatus: EmailDeliveryStatus,
  requiresApproval: boolean
): string {
  if (emailDeliveryStatus === "DISTRIBUTED") {
    return `This report was already sent to emailees. Send again from ${reportLabel}? Recipients may receive a duplicate.`;
  }
  if (emailDeliveryStatus === "PENDING_REVIEW") {
    return `Resend the approval request to reviewers for the report from ${reportLabel}?`;
  }
  if (emailDeliveryStatus === "EXPIRED") {
    return `Send a new approval request for the report from ${reportLabel}?`;
  }
  if (requiresApproval) {
    return `Send report from ${reportLabel} to reviewers for approval?`;
  }
  return `Send report from ${reportLabel} to emailees by email?`;
}

export function SendEmailButton({
  reportId,
  reportLabel,
  emailDeliveryStatus,
  requiresApproval,
  disabled = false,
  onSent,
}: {
  reportId: string;
  reportLabel: string;
  emailDeliveryStatus: EmailDeliveryStatus;
  requiresApproval: boolean;
  disabled?: boolean;
  onSent?: (status: EmailDeliveryStatus) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSend(e: React.MouseEvent) {
    e.stopPropagation();

    const ok = window.confirm(
      confirmMessage(reportLabel, emailDeliveryStatus, requiresApproval)
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      try {
        await sendReportEmail(reportId);
        const nextStatus: EmailDeliveryStatus = requiresApproval
          ? "PENDING_REVIEW"
          : "NOT_APPLICABLE";
        onSent?.(nextStatus);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send email.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSend}
        disabled={disabled || pending}
        className="border-sky-200 text-sky-800 hover:bg-sky-50"
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-1.5 h-4 w-4" />
        )}
        {pending ? "Sending…" : "Send email"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
