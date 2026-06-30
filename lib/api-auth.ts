import { envSecret } from "@/lib/env";

/** When API_SECRET is set, require matching Bearer token on automation routes. */
export function verifyApiSecret(request: Request): Response | null {
  const secret = envSecret("API_SECRET");
  if (!secret) return null;

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (token !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
