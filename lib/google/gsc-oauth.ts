import type {GoogleTokens} from "./google-auth";

export const GSC_READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function getGscRedirectUri(requestUrl: string) {
  return (
    process.env.GOOGLE_GSC_REDIRECT_URI ||
    new URL("/api/connections/google-search-console/callback", requestUrl).toString()
  );
}

export function createGscAuthorizationUrl({
  state,
  redirectUri,
  loginHint,
}: {
  state: string;
  redirectUri: string;
  loginHint?: string | null;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Missing GOOGLE_CLIENT_ID");

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GSC_READONLY_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url;
}

export async function exchangeGscAuthorizationCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Google OAuth credentials");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Google Search Console OAuth exchange failed", {
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error("Google Search Console authorization could not be completed");
  }

  const tokens = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(
      "Google did not return the offline credentials required for Search Console sync. Reconnect and approve read-only access."
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    tokenType: tokens.token_type,
    scope: tokens.scope || GSC_READONLY_SCOPE,
  };
}
