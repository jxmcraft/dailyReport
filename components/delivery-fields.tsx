"use client";

import { useState } from "react";

import { RecipientEmailsInput } from "@/components/recipient-emails-input";
import { inputClass } from "@/components/ui/form-classes";

const SMTP_HINT =
  "Reports use SMTP from .env (SMTP_HOST, SMTP_FROM, and usually SMTP_USER / SMTP_PASS for Gmail).";

export function DeliveryFields({
  target,
  onTargetChange,
  webhookUrl,
  onWebhookUrlChange,
  emails,
  onEmailsChange,
  recipientsFieldName,
}: {
  target: string;
  onTargetChange: (value: string) => void;
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  /** When set, writes comma-separated recipients for native form submit. */
  recipientsFieldName?: string;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{SMTP_HINT}</p>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Target</span>
        <select
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          className={inputClass}
        >
          <option value="SLACK">Slack</option>
          <option value="DISCORD">Discord</option>
          <option value="EMAIL">Email</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Webhook URL</span>
        <span className="block text-xs text-muted-foreground">
          Required for Slack and Discord. Not used for Email.
        </span>
        <input
          value={webhookUrl}
          onChange={(e) => onWebhookUrlChange(e.target.value)}
          placeholder="https://hooks.slack.com/services/…"
          className={inputClass}
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Recipient emails</span>
        <span className="block text-xs text-muted-foreground">
          Required for Email. Add one or more addresses.
        </span>
        <RecipientEmailsInput
          emails={emails}
          onEmailsChange={onEmailsChange}
          name={recipientsFieldName}
        />
      </div>
    </div>
  );
}

/** Client block for the new-agent form (hidden fields sync state for server action). */
export function NewAgentDeliveryFields() {
  const [target, setTarget] = useState("SLACK");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emails, setEmails] = useState<string[]>([]);

  return (
    <>
      <input type="hidden" name="target" value={target} readOnly />
      <input type="hidden" name="webhookUrl" value={webhookUrl} readOnly />
      <DeliveryFields
        target={target}
        onTargetChange={setTarget}
        webhookUrl={webhookUrl}
        onWebhookUrlChange={setWebhookUrl}
        emails={emails}
        onEmailsChange={setEmails}
        recipientsFieldName="recipients"
      />
    </>
  );
}
