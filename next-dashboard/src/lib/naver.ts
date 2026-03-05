import fs from "node:fs";
import path from "node:path";

export type NaverCredentialInfo = {
  clientId: string | null;
  clientSecret: string | null;
  source: string;
  isReady: boolean;
};

let cachedCreds: NaverCredentialInfo | null = null;

function cleanValue(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/^['\"]|['\"]$/g, "");
  return cleaned.length > 0 ? cleaned : null;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    result[key] = val;
  }

  return result;
}

export function getNaverCredentials(): NaverCredentialInfo {
  if (cachedCreds) return cachedCreds;

  const envClientId = cleanValue(process.env.NAVER_CLIENT_ID);
  const envClientSecret = cleanValue(process.env.NAVER_CLIENT_SECRET);
  if (envClientId && envClientSecret) {
    cachedCreds = {
      clientId: envClientId,
      clientSecret: envClientSecret,
      source: "OS Environment",
      isReady: true,
    };
    return cachedCreds;
  }

  const explicitPath = process.env.NAVER_ENV_PATH;
  const cwd = process.cwd();
  const candidates = [
    explicitPath,
    path.join(cwd, ".env"),
    path.resolve(cwd, "../.env"),
    path.resolve(cwd, "../naverapp/.env"),
    path.resolve(cwd, "../../naverapp/.env"),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseEnvFile(filePath);
    const id = cleanValue(parsed.NAVER_CLIENT_ID);
    const secret = cleanValue(parsed.NAVER_CLIENT_SECRET);

    if (id && secret) {
      cachedCreds = {
        clientId: id,
        clientSecret: secret,
        source: filePath,
        isReady: true,
      };
      return cachedCreds;
    }
  }

  cachedCreds = {
    clientId: null,
    clientSecret: null,
    source: "미설정",
    isReady: false,
  };
  return cachedCreds;
}

function buildHeaders() {
  const creds = getNaverCredentials();

  if (!creds.clientId || !creds.clientSecret) {
    throw new Error("NAVER API credentials are missing");
  }

  return {
    "X-Naver-Client-Id": creds.clientId,
    "X-Naver-Client-Secret": creds.clientSecret,
    "Content-Type": "application/json",
  };
}

export async function naverGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store",
  });

  const json = (await res.json()) as T;
  if (!res.ok) {
    const message = (json as { errorMessage?: string }).errorMessage || `NAVER API Error: ${res.status}`;
    throw new Error(message);
  }
  return json;
}

export async function naverPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json()) as T;
  if (!res.ok) {
    const message = (json as { errorMessage?: string }).errorMessage || `NAVER API Error: ${res.status}`;
    throw new Error(message);
  }
  return json;
}
