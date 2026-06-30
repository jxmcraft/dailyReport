"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { updateTopicKeywords } from "@/app/agents/[id]/actions";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";

function normalizeKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const k = part.trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
}

export function KeywordSettings({
  agentId,
  initialKeywords,
  hasCustomScrapeSources,
}: {
  agentId: string;
  initialKeywords: string[];
  hasCustomScrapeSources: boolean;
}) {
  const [input, setInput] = useState(initialKeywords.join(", "));
  const [saved, setSaved] = useState(initialKeywords.join(", "));

  const dirty = input !== saved;

  const { error, pending, save } = useSettingsSave(async () => {
    const keywords = normalizeKeywords(input);
    await updateTopicKeywords(agentId, keywords);
    const display = keywords.join(", ");
    setInput(display);
    setSaved(display);
  });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Built-in sources (News, Reddit, Hacker News, Google) use these keywords.
        {hasCustomScrapeSources
          ? " Keywords are optional when you have webpage scrape sources."
          : " At least one keyword is required."}
      </p>

      <div className="space-y-2">
        <label htmlFor="topic-keywords" className="text-sm font-medium">
          Topic keywords
        </label>
        <input
          id="topic-keywords"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. NVIDIA H200, LLM hardware"
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <p className="text-xs text-muted-foreground">Comma-separated</p>
      </div>

      {input.trim() ? (
        <div className="flex flex-wrap gap-2">
          {normalizeKeywords(input).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {kw}
              <button
                type="button"
                aria-label={`Remove ${kw}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const next = normalizeKeywords(input).filter((k) => k !== kw);
                  setInput(next.join(", "));
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <SettingsSaveFooter dirty={dirty} pending={pending} error={error} onSave={save} />
    </div>
  );
}
