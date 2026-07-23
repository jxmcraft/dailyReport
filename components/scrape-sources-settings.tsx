"use client";

import { useMemo, useState } from "react";

import {
  updateShallowScrapeSettings,
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
import {
  DEFAULT_SHALLOW_SCRAPE_MAX_LINKS,
  MAX_SHALLOW_SCRAPE_LINKS,
} from "@/lib/constants";

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
  initialShallowScrapeMaxLinks,
  hasTopicKeywords,
}: {
  agentId: string;
  initialUrls: string[];
  initialShallowScrapeMaxLinks: number;
  hasTopicKeywords: boolean;
}) {
  const [rows, setRows] = useState(() => urlsToRows(initialUrls));
  const [savedUrls, setSavedUrls] = useState(initialUrls);
  const [shallowScrapeMaxLinks, setShallowScrapeMaxLinks] = useState(
    initialShallowScrapeMaxLinks
  );
  const [savedShallowScrapeMaxLinks, setSavedShallowScrapeMaxLinks] = useState(
    initialShallowScrapeMaxLinks
  );

  const currentUrls = useMemo(() => normalizeUrls(rowsToUrls(rows)), [rows]);
  const dirty =
    currentUrls.length !== savedUrls.length ||
    currentUrls.some((url, i) => url !== savedUrls[i]) ||
    shallowScrapeMaxLinks !== savedShallowScrapeMaxLinks;

  const { error, pending, save } = useSettingsSave(async () => {
    const next = await updateScrapeUrls(agentId, currentUrls);
    await updateShallowScrapeSettings(agentId, shallowScrapeMaxLinks);
    setSavedUrls(next);
    setSavedShallowScrapeMaxLinks(shallowScrapeMaxLinks);
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

      <div className="space-y-3 rounded-lg border border-border/70 bg-slate-50/70 p-4">
        <div className="space-y-1">
          <label htmlFor="shallow-scrape-max-links" className="text-sm font-medium">
            Linked pages to expand per scrape URL
          </label>
          <p className="text-sm text-muted-foreground">
            `0` keeps the current behavior. Higher values scrape up to{" "}
            {MAX_SHALLOW_SCRAPE_LINKS} same-host child links from listing-style
            pages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="shallow-scrape-max-links"
            type="range"
            min={0}
            max={MAX_SHALLOW_SCRAPE_LINKS}
            value={shallowScrapeMaxLinks}
            onChange={(e) => setShallowScrapeMaxLinks(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <span className="w-10 text-right text-sm font-medium">
            {shallowScrapeMaxLinks}
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 off</span>
          <span>Suggested {DEFAULT_SHALLOW_SCRAPE_MAX_LINKS}</span>
          <span>{MAX_SHALLOW_SCRAPE_LINKS} max</span>
        </div>
      </div>

      <SettingsSaveFooter dirty={dirty} pending={pending} error={error} onSave={save} />
    </div>
  );
}
