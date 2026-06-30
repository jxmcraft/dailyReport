import { envSecret } from "@/lib/env";

export type DirectoryEntryType = "user" | "group";

export interface DirectoryEntry {
  id: string;
  displayName: string;
  mail: string;
  type: DirectoryEntryType;
}

export type DirectorySearchKind = "users" | "groups" | "all";

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isMicrosoftGraphConfigured(): boolean {
  return Boolean(
    envSecret("AZURE_TENANT_ID") &&
      envSecret("AZURE_CLIENT_ID") &&
      envSecret("AZURE_CLIENT_SECRET")
  );
}

export function requireGraphSenderUpn(): string {
  const upn = envSecret("GRAPH_SENDER_UPN");
  if (!upn) {
    throw new Error(
      "GRAPH_SENDER_UPN must be set when EMAIL_PROVIDER=graph (service mailbox UPN)."
    );
  }
  return upn;
}

function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function getAccessToken(): Promise<string> {
  if (!isMicrosoftGraphConfigured()) {
    throw new Error(
      "Microsoft Graph is not configured (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)."
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const tenantId = envSecret("AZURE_TENANT_ID")!;
  const clientId = envSecret("AZURE_CLIENT_ID")!;
  const clientSecret = envSecret("AZURE_CLIENT_SECRET")!;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? `Graph token request failed (${response.status}).`
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export async function graphFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  const url = path.startsWith("https://")
    ? path
    : `https://graph.microsoft.com/v1.0${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

interface GraphDirectoryRow {
  id: string;
  displayName?: string;
  mail?: string | null;
}

function mapRow(row: GraphDirectoryRow, type: DirectoryEntryType): DirectoryEntry | null {
  const mail = row.mail?.trim();
  if (!mail) return null;
  return {
    id: row.id,
    displayName: row.displayName?.trim() || mail,
    mail: mail.toLowerCase(),
    type,
  };
}

async function searchUsers(query: string): Promise<DirectoryEntry[]> {
  const term = odataEscape(query.trim());
  if (!term) return [];

  const filter = `startswith(displayName,'${term}') or startswith(mail,'${term}')`;
  const response = await graphFetch(
    `/users?$filter=${encodeURIComponent(filter)}&$select=id,displayName,mail&$top=15`
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Graph user search failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { value?: GraphDirectoryRow[] };
  const out: DirectoryEntry[] = [];
  for (const row of data.value ?? []) {
    const entry = mapRow(row, "user");
    if (entry) out.push(entry);
  }
  return out;
}

async function searchGroups(query: string): Promise<DirectoryEntry[]> {
  const term = odataEscape(query.trim());
  if (!term) return [];

  const filter = `startswith(displayName,'${term}') or startswith(mail,'${term}')`;
  const response = await graphFetch(
    `/groups?$filter=${encodeURIComponent(filter)}&$select=id,displayName,mail&$top=15`
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Graph group search failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { value?: GraphDirectoryRow[] };
  const out: DirectoryEntry[] = [];
  for (const row of data.value ?? []) {
    const entry = mapRow(row, "group");
    if (entry) out.push(entry);
  }
  return out;
}

export async function searchDirectory(
  query: string,
  kind: DirectorySearchKind = "all"
): Promise<DirectoryEntry[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const results: DirectoryEntry[] = [];
  const seen = new Set<string>();

  const add = (entries: DirectoryEntry[]) => {
    for (const entry of entries) {
      if (seen.has(entry.mail)) continue;
      seen.add(entry.mail);
      results.push(entry);
    }
  };

  if (kind === "users" || kind === "all") {
    add(await searchUsers(q));
  }
  if (kind === "groups" || kind === "all") {
    add(await searchGroups(q));
  }

  return results.slice(0, 20);
}
