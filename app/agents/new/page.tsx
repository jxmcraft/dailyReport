import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { WebSourcesSection } from "@/components/web-sources-section";
import { createAgent } from "./actions";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New Agent</h1>

      <form action={createAgent} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Name</span>
              <input
                name="name"
                required
                placeholder="Daily Competitor Intelligence"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Topic keywords (comma-separated)</span>
              <input
                name="keywords"
                placeholder="LLM hardware, NVIDIA H200"
                className={inputClass}
              />
            </label>
            <div className="flex gap-3">
              <label className="flex-1 space-y-1.5">
                <span className="text-sm font-medium">Frequency</span>
                <select name="frequency" defaultValue="Daily" className={inputClass}>
                  <option>Hourly</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </label>
              <label className="flex-1 space-y-1.5">
                <span className="text-sm font-medium">Time</span>
                <input type="time" name="time" defaultValue="07:00" className={inputClass} />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">System prompt</span>
              <Textarea
                name="systemPrompt"
                className="min-h-[120px]"
                placeholder="Summarize the latest news into a concise Markdown brief..."
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sources (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <WebSourcesSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Target</span>
              <select name="target" defaultValue="SLACK" className={inputClass}>
                <option value="SLACK">SLACK</option>
                <option value="DISCORD">DISCORD</option>
                <option value="EMAIL">EMAIL</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Webhook URL</span>
              <input
                name="webhookUrl"
                placeholder="https://hooks.slack.com/services/..."
                className={inputClass}
              />
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit">Create Agent</Button>
        </div>
      </form>
    </div>
  );
}
