"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSettingsSave } from "@/hooks/use-settings-save";
import {
  optimizePromptAction,
  updateSystemPrompt,
} from "@/app/agents/[id]/actions";

export function MarkdownPreview({
  initialPrompt,
  agentId,
}: {
  initialPrompt: string;
  agentId: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt);
  const [optimizedDraft, setOptimizedDraft] = useState<string | null>(null);
  const [optimizing, startOptimize] = useTransition();
  const dirty = prompt !== savedPrompt;

  const { error, pending, save, setError } = useSettingsSave(async () => {
    await updateSystemPrompt(agentId, prompt);
    setSavedPrompt(prompt);
    setOptimizedDraft(null);
  });

  function runOptimizer() {
    setError(null);
    startOptimize(async () => {
      try {
        const { optimized } = await optimizePromptAction(agentId, prompt);
        setOptimizedDraft(optimized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Optimization failed.");
      }
    });
  }

  function applyOptimized() {
    if (!optimizedDraft) return;
    setPrompt(optimizedDraft);
    setOptimizedDraft(null);
  }

  const previewText = optimizedDraft ?? prompt;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-4">
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={runOptimizer}
          disabled={optimizing || !prompt.trim()}
        >
          {optimizing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          {optimizing ? "Optimizing…" : "Optimize"}
        </Button>
        {!dirty && !pending ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        ) : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>

      {optimizedDraft ? (
        <div className="rounded-lg border border-violet-200/80 bg-violet-50/80 px-4 py-3 text-sm">
          <p className="font-medium text-violet-950">Suggested prompt</p>
          <p className="mt-1 text-sm text-violet-900/80">
            Preview updated on the right. Apply to edit, then save.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={applyOptimized}>
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOptimizedDraft(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            System prompt
          </span>
          <Textarea
            className="min-h-[320px] resize-y font-mono text-sm leading-relaxed"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Preview
            {optimizedDraft ? (
              <span className="ml-2 text-xs font-normal text-violet-600">
                (suggested)
              </span>
            ) : null}
          </span>
          <div className="prose-report min-h-[320px] overflow-auto rounded-lg border border-border/60 bg-white p-5">
            <ReactMarkdown>
              {previewText || "_Start typing to preview…_"}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
