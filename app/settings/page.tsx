import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/page-shell";

export default function SettingsPage() {
  return (
    <PageShell size="md">
      <PageHeader
        title="Settings"
        description="Workspace-level configuration."
      />

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between gap-4 border-b border-border/60 pb-4">
            <span className="text-muted-foreground">LLM provider</span>
            <span className="text-right font-medium text-foreground">
              OpenRouter (poolside/laguna-m.1:free)
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-4">
            <span className="text-muted-foreground">Execution timeout</span>
            <span className="font-medium text-foreground">180s</span>
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
