"use client";

import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SettingsSaveFooter({
  dirty,
  pending,
  error,
  onSave,
  label = "Save",
  align = "start",
  borderless = false,
}: {
  dirty: boolean;
  pending: boolean;
  error: string | null;
  onSave: () => void;
  label?: string;
  align?: "start" | "end";
  borderless?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${
        borderless ? "" : "border-t border-border/60 pt-4"
      } ${align === "end" ? "justify-end" : ""}`}
    >
      <Button size="sm" type="button" onClick={onSave} disabled={!dirty || pending}>
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        {pending ? "Saving…" : label}
      </Button>
      {!dirty && !pending ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
