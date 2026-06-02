"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateSystemPrompt } from "@/app/agents/[id]/actions";

export function MarkdownPreview({
  initialPrompt,
  agentId,
}: {
  initialPrompt: string;
  agentId: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = prompt !== savedPrompt;

  function savePrompt() {
    setError(null);
    startTransition(async () => {
      try {
        await updateSystemPrompt(agentId, prompt);
        setSavedPrompt(prompt);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save prompt.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={savePrompt} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {pending ? "Saving..." : "Save prompt"}
        </Button>
        {!dirty && !pending ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        ) : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">System Prompt</span>
          <Textarea
            className="min-h-[280px] font-mono text-xs"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Live Preview</span>
          <div className="prose prose-sm prose-slate min-h-[280px] max-w-none overflow-auto rounded-md border border-border bg-white p-4">
            <ReactMarkdown>{prompt || "_Start typing to preview..._"}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
