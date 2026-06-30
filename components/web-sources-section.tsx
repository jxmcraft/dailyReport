"use client";

import { useState } from "react";

import { validateScrapeUrl } from "@/app/agents/new/actions";
import {
  emptyScrapeRow,
  ScrapeUrlEditor,
} from "@/components/scrape-url-editor";

export function WebSourcesSection() {
  const [rows, setRows] = useState([emptyScrapeRow()]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Built-in sources (News, Reddit, Hacker News, and Google) run automatically
        from your topic keywords. Optionally add specific webpage URLs to scrape —
        just paste the link, no API needed.
      </p>

      <ScrapeUrlEditor
        rows={rows}
        onRowsChange={setRows}
        checkUrl={validateScrapeUrl}
        formMode
      />
    </div>
  );
}
