import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/page-shell";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { loadWorkspaceSettings } from "@/app/settings/actions";
import { getLlmDisplayInfo } from "@/lib/llm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [llm, workspace] = await Promise.all([
    getLlmDisplayInfo(),
    loadWorkspaceSettings(),
  ]);
  const providerLabel =
    llm.provider === "deepseek" ? "DeepSeek" : "OpenRouter";

  return (
    <PageShell size="md">
      <PageHeader
        title="Settings"
        description="Workspace-level configuration."
      />

      <Card className="mb-6 border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Runtime</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkspaceSettingsForm initial={workspace} />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">LLM (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Change provider and models via <code className="text-xs">.env</code>{" "}
            and restart the dev server.
          </p>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-4">
            <span className="text-muted-foreground">LLM provider</span>
            <span className="text-right font-medium text-foreground">
              {providerLabel}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-4">
            <span className="text-muted-foreground">Report model</span>
            <span className="max-w-[60%] text-right font-mono text-xs font-medium text-foreground">
              {llm.reportModel}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-4">
            <span className="text-muted-foreground">Optimizer model</span>
            <span className="max-w-[60%] text-right font-mono text-xs font-medium text-foreground">
              {llm.optimizerModel}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-4">
            <span className="text-muted-foreground">Chat endpoint</span>
            <span className="max-w-[60%] break-all text-right font-mono text-xs font-medium text-foreground">
              {llm.chatEndpoint}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Database</span>
            <span className="font-medium text-foreground">
              PostgreSQL (Prisma)
            </span>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
