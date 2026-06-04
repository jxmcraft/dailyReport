"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form-classes";
import { parseEmails } from "@/lib/delivery-config";

const recipientInputClass = `${inputClass} flex-1`;

export function RecipientEmailsInput({
  emails,
  onEmailsChange,
  name,
}: {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  /** When set, writes comma-separated value for native form submit. */
  name?: string;
}) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function addFromDraft() {
    const parsed = parseEmails(draft);
    if (parsed.length === 0) {
      setHint("Enter a valid email address.");
      return;
    }
    setHint(null);
    const seen = new Set(emails);
    const merged = [...emails];
    for (const e of parsed) {
      if (!seen.has(e)) {
        seen.add(e);
        merged.push(e);
      }
    }
    onEmailsChange(merged);
    setDraft("");
  }

  function remove(email: string) {
    onEmailsChange(emails.filter((e) => e !== email));
  }

  return (
    <div className="space-y-3">
      {name ? (
        <input type="hidden" name={name} value={emails.join(", ")} readOnly />
      ) : null}

      {emails.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <li
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-slate-50 py-1 pl-3 pr-1 text-sm"
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={() => remove(email)}
                className="rounded-full p-1 text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No recipients yet. Add at least one.</p>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromDraft();
            }
          }}
          placeholder="name@example.com"
          className={recipientInputClass}
        />
        <Button type="button" variant="outline" onClick={addFromDraft}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {hint ? (
        <p className="text-xs text-destructive" role="alert">
          {hint}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add multiple recipients. Paste comma-separated addresses to add several at once.
        </p>
      )}
    </div>
  );
}
