import {db} from "@/lib/db";
import {decrypt, encrypt} from "@/lib/encryption";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

type EncryptedGoogleTokenEnvelope = {
  version: 1;
  encrypted: string;
};

export class ReauthRequiredError extends Error {
  constructor() {
    super("Your Google Search Console connection has expired. Please reconnect it from Connections.");
    this.name = "ReauthRequiredError";
  }
}

function isEncryptedEnvelope(value: unknown): value is EncryptedGoogleTokenEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.version === 1 && typeof record.encrypted === "string";
}

function parseStoredGoogleTokens(value: unknown): GoogleTokens | null {
  if (!value) return null;

  if (isEncryptedEnvelope(value)) {
    try {
      return JSON.parse(decrypt(value.encrypted)) as GoogleTokens;
    } catch {
      throw new ReauthRequiredError();
    }
  }

  // Transitional read path for existing CrawlSEO rows. New writes are always
  // encrypted. The legacy shape can be removed after migration verification.
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as GoogleTokens;
  }

  return null;
}

export async function storeGoogleTokens(userId: string, tokens: GoogleTokens) {
  const envelope: EncryptedGoogleTokenEnvelope = {
    version: 1,
    encrypted: encrypt(JSON.stringify(tokens)),
  };

  await db.user.update({
    where: {id: userId},
    data: {googleTokens: envelope},
  });
}

export async function hasGoogleSearchConsoleConnection(userId: string) {
  const user = await db.user.findUnique({
    where: {id: userId},
    select: {googleTokens: true},
  });

  const tokens = parseStoredGoogleTokens(user?.googleTokens);
  return Boolean(tokens?.refreshToken || tokens?.accessToken);
}

/**
 * Refreshes a Google Search Console access token if expired.
 * Throws ReauthRequiredError when the refresh token is invalid/expired.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (body.includes("invalid_grant")) throw new ReauthRequiredError();
    throw new Error(
      `Failed to refresh Google token: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/** Gets a valid Search Console access token, refreshing if necessary. */
export async function getAccessToken(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: {id: userId},
    select: {googleTokens: true},
  });

  const tokens = parseStoredGoogleTokens(user?.googleTokens);
  if (!tokens) throw new ReauthRequiredError();
  if (!tokens.accessToken && !tokens.refreshToken) throw new ReauthRequiredError();

  if (!tokens.expiresAt || tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
    if (!tokens.refreshToken) throw new ReauthRequiredError();

    const refreshed = await refreshAccessToken(tokens.refreshToken);
    const updatedTokens: GoogleTokens = {
      ...tokens,
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    };
    await storeGoogleTokens(userId, updatedTokens);
    return refreshed.accessToken;
  }

  if (!tokens.accessToken) throw new ReauthRequiredError();
  return tokens.accessToken;
}
