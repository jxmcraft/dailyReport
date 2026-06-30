"use client";

import { useState } from "react";

import { updateRelevanceSettings } from "@/app/agents/[id]/actions";
import { KeywordChips } from "@/components/keyword-chips";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";
import { TOP_K } from "@/lib/constants";
import {
  DEFAULT_RELEVANCE_MIN_SCORE,
  MAX_RELEVANCE_SCORE,
  MIN_RELEVANCE_SCORE,
} from "@/lib/ranking";
import { DEFAULT_MAX_NEWS_AGE_DAYS } from "@/lib/recency";
import type { KeywordMatchMode } from "@/lib/agents";

const DEFAULT_MIN_RANKED_SOURCES = 3;

export function RelevanceSettings({
  agentId,
  initialMinScore,
  initialMinRankedSources,
  initialMatchMode,
  topicKeywords,
}: {
  agentId: string;
  initialMinScore: number;
  initialMinRankedSources: number;
  initialMatchMode: KeywordMatchMode;
  topicKeywords: string[];
}) {
  const [minScore, setMinScore] = useState(initialMinScore);
  const [minRankedSources, setMinRankedSources] = useState(initialMinRankedSources);
  const [matchMode, setMatchMode] = useState<KeywordMatchMode>(initialMatchMode);
  const [saved, setSaved] = useState({
    minScore: initialMinScore,
    minRankedSources: initialMinRankedSources,
    matchMode: initialMatchMode,
  });

  const dirty =
    minScore !== saved.minScore ||
    minRankedSources !== saved.minRankedSources ||
    matchMode !== saved.matchMode;

  const { error, pending, save } = useSettingsSave(async () => {
    await updateRelevanceSettings(agentId, minScore, matchMode, minRankedSources);
    setSaved({ minScore, minRankedSources, matchMode });
  });

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Articles must match your keywords and fall within the last{" "}
        {DEFAULT_MAX_NEWS_AGE_DAYS} days. The pipeline aborts if fewer than the
        minimum ranked sources pass filtering before calling the LLM.
      </p>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="min-ranked-sources" className="text-sm font-medium">
            Minimum ranked sources
          </label>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {minRankedSources}
          </span>
        </div>
        <input
          id="min-ranked-sources"
          type="range"
          min={1}
          max={TOP_K}
          value={minRankedSources}
          onChange={(e) => setMinRankedSources(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 permissive</span>
          <span>Default {DEFAULT_MIN_RANKED_SOURCES}</span>
          <span>{TOP_K} max</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="relevance-min-score" className="text-sm font-medium">
            Minimum relevance score
          </label>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {minScore}
          </span>
        </div>
        <input
          id="relevance-min-score"
          type="range"
          min={MIN_RELEVANCE_SCORE}
          max={MAX_RELEVANCE_SCORE}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{MIN_RELEVANCE_SCORE} permissive</span>
          <span>Default {DEFAULT_RELEVANCE_MIN_SCORE}</span>
          <span>{MAX_RELEVANCE_SCORE} strict</span>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Keyword matching</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 transition-colors ${
              matchMode === "OR"
                ? "border-primary bg-primary/5"
                : "border-border/70 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name="match-mode"
                checked={matchMode === "OR"}
                onChange={() => setMatchMode("OR")}
                className="accent-primary"
              />
              OR — any keyword
            </span>
            <span className="pl-6 text-xs text-muted-foreground">
              Best for broad topics
            </span>
          </label>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 transition-colors ${
              matchMode === "AND"
                ? "border-primary bg-primary/5"
                : "border-border/70 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name="match-mode"
                checked={matchMode === "AND"}
                onChange={() => setMatchMode("AND")}
                className="accent-primary"
              />
              AND — multiple keywords
            </span>
            <span className="pl-6 text-xs text-muted-foreground">
              Stricter, fewer results
            </span>
          </label>
        </div>
      </fieldset>

      <KeywordChips keywords={topicKeywords} variant="muted" />

      <SettingsSaveFooter
        dirty={dirty}
        pending={pending}
        error={error}
        onSave={save}
        label="Save settings"
      />
    </div>
  );
}
