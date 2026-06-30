"use client";

import { useState } from "react";

import { updateDeliverySettings } from "@/app/agents/[id]/actions";
import { DeliveryFields } from "@/components/delivery-fields";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";
import type { DeliveryChannelView } from "@/lib/agents";

function listsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function DeliverySettings({
  agentId,
  channel,
}: {
  agentId: string;
  channel?: DeliveryChannelView;
}) {
  const [target, setTarget] = useState(channel?.target ?? "SLACK");
  const [webhookUrl, setWebhookUrl] = useState(channel?.webhookUrl ?? "");
  const [emails, setEmails] = useState<string[]>(channel?.recipientList ?? []);
  const [approvers, setApprovers] = useState<string[]>(channel?.approverList ?? []);
  const [requireEmailApproval, setRequireEmailApproval] = useState(
    channel?.requireEmailApproval ?? true
  );
  const [autoSendEmail, setAutoSendEmail] = useState(
    channel?.autoSendEmail ?? true
  );
  const [saved, setSaved] = useState({
    target: channel?.target ?? "SLACK",
    webhookUrl: channel?.webhookUrl ?? "",
    emails: channel?.recipientList ?? [],
    approvers: channel?.approverList ?? [],
    requireEmailApproval: channel?.requireEmailApproval ?? true,
    autoSendEmail: channel?.autoSendEmail ?? true,
  });

  const dirty =
    target !== saved.target ||
    webhookUrl !== saved.webhookUrl ||
    !listsEqual(emails, saved.emails) ||
    !listsEqual(approvers, saved.approvers) ||
    requireEmailApproval !== saved.requireEmailApproval ||
    autoSendEmail !== saved.autoSendEmail;

  const { error, pending, save } = useSettingsSave(async () => {
    await updateDeliverySettings(
      agentId,
      target,
      webhookUrl,
      emails.join(", "),
      approvers.join(", "),
      requireEmailApproval,
      autoSendEmail
    );
    setSaved({
      target,
      webhookUrl,
      emails: [...emails],
      approvers: [...approvers],
      requireEmailApproval,
      autoSendEmail,
    });
  });

  return (
    <div className="space-y-5">
      <DeliveryFields
        target={target}
        onTargetChange={setTarget}
        webhookUrl={webhookUrl}
        onWebhookUrlChange={setWebhookUrl}
        emails={emails}
        onEmailsChange={setEmails}
        approvers={approvers}
        onApproversChange={setApprovers}
        requireEmailApproval={requireEmailApproval}
        onRequireEmailApprovalChange={setRequireEmailApproval}
        autoSendEmail={autoSendEmail}
        onAutoSendEmailChange={setAutoSendEmail}
      />
      <SettingsSaveFooter
        dirty={dirty}
        pending={pending}
        error={error}
        onSave={save}
        label="Save delivery"
        align="end"
      />
    </div>
  );
}
