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
  approvers,
  onApproversChange,
  requireEmailApproval,
  onRequireEmailApprovalChange,
  autoSendEmail,
  onAutoSendEmailChange,
  recipientsFieldName,
  approversFieldName,
  requireApprovalFieldName,
  autoSendFieldName,
}: {
  target: string;
  onTargetChange: (value: string) => void;
  webhookUrl: string;
  onWebhookUrlChange: (value: string) => void;
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  approvers: string[];
  onApproversChange: (emails: string[]) => void;
  requireEmailApproval: boolean;
  onRequireEmailApprovalChange: (value: boolean) => void;
  autoSendEmail: boolean;
  onAutoSendEmailChange: (value: boolean) => void;
  /** When set, writes comma-separated recipients for native form submit. */
  recipientsFieldName?: string;
  approversFieldName?: string;
  requireApprovalFieldName?: string;
  autoSendFieldName?: string;
}) {
  const isEmail = target === "EMAIL";

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

      {isEmail ? (
        <>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={requireEmailApproval}
              onChange={(e) => onRequireEmailApprovalChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">Require reviewer approval</span>
              <span className="block text-xs text-muted-foreground">
                Send to designated reviewers first; any one can approve to distribute to
                emailees.
              </span>
            </span>
            {requireApprovalFieldName ? (
              <input
                type="hidden"
                name={requireApprovalFieldName}
                value={requireEmailApproval ? "true" : "false"}
                readOnly
              />
            ) : null}
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={autoSendEmail}
              onChange={(e) => onAutoSendEmailChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Auto-send email after each run
              </span>
              <span className="block text-xs text-muted-foreground">
                When off, reports are saved but not emailed until you click Send
                on a report.
              </span>
            </span>
            {autoSendFieldName ? (
              <input
                type="hidden"
                name={autoSendFieldName}
                value={autoSendEmail ? "true" : "false"}
                readOnly
              />
            ) : null}
          </label>

          {requireEmailApproval ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">Designated reviewers</span>
              <span className="block text-xs text-muted-foreground">
                Receive the report first with an approve link. Any one reviewer can approve.
              </span>
              <RecipientEmailsInput
                emails={approvers}
                onEmailsChange={onApproversChange}
                name={approversFieldName}
                placeholder="Add reviewer email…"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="text-sm font-medium">Emailees</span>
            <span className="block text-xs text-muted-foreground">
              Final recipients after approval (or immediately if approval is off). Outlook and
              M365 distribution groups work as normal SMTP addresses.
            </span>
            <RecipientEmailsInput
              emails={emails}
              onEmailsChange={onEmailsChange}
              name={recipientsFieldName}
              placeholder="Add emailee email…"
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <span className="text-sm font-medium">Recipient emails</span>
          <span className="block text-xs text-muted-foreground">
            Only used when target is Email.
          </span>
          <RecipientEmailsInput
            emails={emails}
            onEmailsChange={onEmailsChange}
            name={recipientsFieldName}
          />
        </div>
      )}
    </div>
  );
}

/** Client block for the new-agent form (hidden fields sync state for server action). */
export function NewAgentDeliveryFields() {
  const [target, setTarget] = useState("SLACK");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<string[]>([]);
  const [requireEmailApproval, setRequireEmailApproval] = useState(true);
  const [autoSendEmail, setAutoSendEmail] = useState(true);

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
        approvers={approvers}
        onApproversChange={setApprovers}
        requireEmailApproval={requireEmailApproval}
        onRequireEmailApprovalChange={setRequireEmailApproval}
        autoSendEmail={autoSendEmail}
        onAutoSendEmailChange={setAutoSendEmail}
        recipientsFieldName="recipients"
        approversFieldName="approvers"
        requireApprovalFieldName="requireEmailApproval"
        autoSendFieldName="autoSendEmail"
      />
    </>
  );
}
