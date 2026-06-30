"use client";

import { useMemo, useState } from "react";

import {
  updateScrapeUrls,
  validateScrapeUrlAction,
} from "@/app/agents/[id]/actions";
import {
  rowsToUrls,
  ScrapeUrlEditor,
  urlsToRows,
} from "@/components/scrape-url-editor";
import { SettingsSaveFooter } from "@/components/settings-save-footer";
import { useSettingsSave } from "@/hooks/use-settings-save";

function normalizeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

export function ScrapeSourcesSettings({
  agentId,
  initialUrls,
  hasTopicKeywords,
}: {
  agentId: string;
  initialUrls: string[];
  hasTopicKeywords: boolean;
}) {
  const [rows, setRows] = useState(() => urlsToRows(initialUrls));
  const [savedUrls, setSavedUrls] = useState(initialUrls);

  const currentUrls = useMemo(() => normalizeUrls(rowsToUrls(rows)), [rows]);
  const dirty =
    currentUrls.length !== savedUrls.length ||
    currentUrls.some((url, i) => url !== savedUrls[i]);

  const { error, pending, save } = useSettingsSave(async () => {
    const next = await updateScrapeUrls(agentId, currentUrls);
    setSavedUrls(next);
    setRows(urlsToRows(next));
  });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Built-in sources (News, Reddit, Hacker News, and Google) run from topic
        keywords. Add webpage URLs to scrape as additional sources.
        {hasTopicKeywords
          ? " You can remove all scrape URLs if keywords are set."
          : " At least one scrape URL is required when no keywords are set."}
      </p>

      <ScrapeUrlEditor
        rows={rows}
        onRowsChange={setRows}
        checkUrl={validateScrapeUrlAction}
      />

      <SettingsSaveFooter dirty={dirty} pending={pending} error={error} onSave={save} />
    </div>
  );
}
