import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageShell } from "@/components/page-shell";
import { NewAgentDeliveryFields } from "@/components/delivery-fields";
import { inputClass } from "@/components/ui/form-classes";
import { WebSourcesSection } from "@/components/web-sources-section";
import { isMicrosoftGraphConfigured } from "@/lib/microsoft-graph";
import { createAgent } from "./actions";

export default async function NewAgentPage() {
  const directorySearchEnabled = isMicrosoftGraphConfigured();
  return (
    <PageShell size="md">
      <PageHeader
        backHref="/"
        backLabel="Dashboard"
        title="New agent"
        description="Set up keywords, schedule, and optional custom sources."
      />

      <form action={createAgent} className="space-y-6">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Name</span>
              <input
                name="name"
                required
                placeholder="Daily Competitor Intelligence"
                className={inputClass}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Topic keywords (comma-separated)
              </span>
              <input
                name="keywords"
                placeholder="LLM hardware, NVIDIA H200"
                className={inputClass}
              />
            </label>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Built-in providers</legend>
              <p className="text-sm text-muted-foreground">
                Keyword-based providers run only when enabled here and configured in
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["enableNewsApi", "News"],
                  ["enableReddit", "Reddit"],
                  ["enableHackerNews", "Hacker News"],
                  ["enableGoogleSearch", "Google"],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value="true"
                      defaultChecked
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Frequency</span>
                <select
                  name="frequency"
                  defaultValue="Daily"
                  className={inputClass}
                >
                  <option>Hourly</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Time</span>
                <input
                  type="time"
                  name="time"
                  defaultValue="07:00"
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">System prompt</span>
              <Textarea
                name="systemPrompt"
                className="min-h-[140px] resize-y"
                placeholder="Summarize the latest news into a concise Markdown brief…"
              />
            </label>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Custom sources (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <WebSourcesSection />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <NewAgentDeliveryFields directorySearchEnabled={directorySearchEnabled} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit">Create agent</Button>
        </div>
      </form>
    </PageShell>
  );
}
