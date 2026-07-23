"use client";

import { useState } from "react";

import { updateRelevanceSettings } from "@/app/agents/[id]/actions";
import { KeywordChips } from "@/components/keyword-chips";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";
import {
  DEFAULT_MAX_RANKED_SOURCES,
  DEFAULT_MIN_RANKED_SOURCES,
  MAX_RANKED_SOURCES_CEILING,
} from "@/lib/constants";
import {
  DEFAULT_RELEVANCE_MIN_SCORE,
  MAX_RELEVANCE_SCORE,
  MIN_RELEVANCE_SCORE,
} from "@/lib/ranking";
import { DEFAULT_MAX_NEWS_AGE_DAYS } from "@/lib/recency";
import type { KeywordMatchMode } from "@/lib/agents";

export function RelevanceSettings({
  agentId,
  initialMinScore,
  initialMinRankedSources,
  initialMaxRankedSources,
  initialMatchMode,
  topicKeywords,
}: {
  agentId: string;
  initialMinScore: number;
  initialMinRankedSources: number;
  initialMaxRankedSources: number;
  initialMatchMode: KeywordMatchMode;
  topicKeywords: string[];
}) {
  const [minScore, setMinScore] = useState(initialMinScore);
  const [maxRankedSources, setMaxRankedSources] = useState(
    initialMaxRankedSources
  );
  const [minRankedSources, setMinRankedSources] = useState(
    Math.min(initialMinRankedSources, initialMaxRankedSources)
  );
  const [matchMode, setMatchMode] = useState<KeywordMatchMode>(initialMatchMode);
  const [saved, setSaved] = useState({
    minScore: initialMinScore,
    minRankedSources: Math.min(initialMinRankedSources, initialMaxRankedSources),
    maxRankedSources: initialMaxRankedSources,
    matchMode: initialMatchMode,
  });

  const dirty =
    minScore !== saved.minScore ||
    minRankedSources !== saved.minRankedSources ||
    maxRankedSources !== saved.maxRankedSources ||
    matchMode !== saved.matchMode;

  const { error, pending, save } = useSettingsSave(async () => {
    await updateRelevanceSettings(
      agentId,
      minScore,
      matchMode,
      minRankedSources,
      maxRankedSources
    );
    setSaved({ minScore, minRankedSources, maxRankedSources, matchMode });
  });

  function onMaxChange(nextMax: number) {
    setMaxRankedSources(nextMax);
    if (minRankedSources > nextMax) {
      setMinRankedSources(nextMax);
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Articles must match your keywords and fall within the last{" "}
        {DEFAULT_MAX_NEWS_AGE_DAYS} days. Max sources is how many ranked articles
        enter the LLM; the run aborts if fewer than the minimum pass filtering.
      </p>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="max-ranked-sources" className="text-sm font-medium">
            Max sources in report
          </label>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {maxRankedSources}
          </span>
        </div>
        <input
          id="max-ranked-sources"
          type="range"
          min={1}
          max={MAX_RANKED_SOURCES_CEILING}
          value={maxRankedSources}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>Default {DEFAULT_MAX_RANKED_SOURCES}</span>
          <span>{MAX_RANKED_SOURCES_CEILING} max</span>
        </div>
      </div>

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
          max={maxRankedSources}
          value={minRankedSources}
          onChange={(e) => setMinRankedSources(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 permissive</span>
          <span>Default {DEFAULT_MIN_RANKED_SOURCES}</span>
          <span>Up to max ({maxRankedSources})</span>
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
