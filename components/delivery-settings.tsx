"use client";

import { useState } from "react";

import { updateDeliverySettings } from "@/app/agents/[id]/actions";
import { DeliveryFields } from "@/components/delivery-fields";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";
import type { DeliveryChannelView } from "@/lib/agents";

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
  const [saved, setSaved] = useState({
    target: channel?.target ?? "SLACK",
    webhookUrl: channel?.webhookUrl ?? "",
    emails: channel?.recipientList ?? [],
  });

  const emailsDirty =
    emails.length !== saved.emails.length ||
    emails.some((e, i) => e !== saved.emails[i]);

  const dirty =
    target !== saved.target ||
    webhookUrl !== saved.webhookUrl ||
    emailsDirty;

  const { error, pending, save } = useSettingsSave(async () => {
    await updateDeliverySettings(agentId, target, webhookUrl, emails.join(", "));
    setSaved({ target, webhookUrl, emails: [...emails] });
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
