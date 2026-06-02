import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace-level configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>LLM Provider</span>
            <span className="font-medium text-foreground">
              OpenRouter (poolside/laguna-m.1:free)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Execution Timeout</span>
            <span className="font-medium text-foreground">180s</span>
          </div>
          <div className="flex justify-between">
            <span>Database</span>
            <span className="font-medium text-foreground">PostgreSQL (Prisma)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
