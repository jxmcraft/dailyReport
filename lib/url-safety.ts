const LOCAL_HOSTS = new Set(["localhost", "local"]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isIpLiteral(hostname: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

export function assertUrlIsSafeForScrape(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// scrape URLs are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Local network addresses are blocked for scrape URLs.");
  }

  if (isIpLiteral(hostname) && isPrivateIpv4(hostname)) {
    throw new Error("Private or link-local IP addresses are blocked for scrape URLs.");
  }

  return url;
}
