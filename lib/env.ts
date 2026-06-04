/** Non-empty trimmed value from process.env, or undefined if missing/blank. */
export function envSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function isEnvConfigured(name: string): boolean {
  return envSecret(name) !== undefined;
}
