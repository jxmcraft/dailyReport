import { envSecret } from "@/lib/env";

/** Public base URL for approval links and other outbound URLs (no trailing slash). */
export function getAppBaseUrl(): string {
  const explicit = envSecret("APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}`;
}
