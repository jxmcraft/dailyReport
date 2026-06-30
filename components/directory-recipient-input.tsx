"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";

import { searchDirectoryAction } from "@/app/agents/[id]/actions";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form-classes";
import { parseEmails } from "@/lib/delivery-config";
import type { DirectoryEntry, DirectorySearchKind } from "@/lib/microsoft-graph";

const recipientInputClass = `${inputClass} flex-1`;

export function DirectoryRecipientInput({
  emails,
  onEmailsChange,
  name,
  placeholder = "Search name or email…",
  searchKind = "all",
  labels = {},
}: {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  name?: string;
  placeholder?: string;
  searchKind?: DirectorySearchKind;
  labels?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [labelByMail, setLabelByMail] = useState<Record<string, string>>(labels);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLabelByMail((prev) => ({ ...prev, ...labels }));
  }, [labels]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      void searchDirectoryAction(q, searchKind)
        .then((entries) => {
          setResults(entries);
          setSearchError(null);
        })
        .catch((err) => {
          setResults([]);
          setSearchError(
            err instanceof Error ? err.message : "Directory search failed."
          );
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchKind]);

  function addEmail(mail: string, displayName?: string) {
    const normalized = mail.trim().toLowerCase();
    if (!normalized || emails.includes(normalized)) return;
    onEmailsChange([...emails, normalized]);
    if (displayName) {
      setLabelByMail((prev) => ({ ...prev, [normalized]: displayName }));
    }
    setQuery("");
    setResults([]);
  }

  function addManualFromQuery() {
    const parsed = parseEmails(query);
    if (parsed.length === 0) return;
    const merged = [...emails];
    const seen = new Set(emails);
    for (const e of parsed) {
      if (!seen.has(e)) {
        seen.add(e);
        merged.push(e);
      }
    }
    onEmailsChange(merged);
    setQuery("");
    setResults([]);
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
              <span title={email}>
                {labelByMail[email] && labelByMail[email] !== email
                  ? `${labelByMail[email]} (${email})`
                  : email}
              </span>
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

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results.length > 0) {
                    addEmail(results[0].mail, results[0].displayName);
                  } else {
                    addManualFromQuery();
                  }
                }
              }}
              placeholder={placeholder}
              className={`${recipientInputClass} pl-9`}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addManualFromQuery}
            disabled={parseEmails(query).length === 0}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>

        {searching ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching directory…
          </p>
        ) : null}

        {searchError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {searchError}
          </p>
        ) : null}

        {results.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border/70 bg-white py-1 shadow-md">
            {results.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => addEmail(entry.mail, entry.displayName)}
                >
                  <span className="font-medium">{entry.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.mail} · {entry.type === "group" ? "Group" : "User"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Search M365 users and mail-enabled groups, or paste an email address and click Add.
      </p>
    </div>
  );
}
