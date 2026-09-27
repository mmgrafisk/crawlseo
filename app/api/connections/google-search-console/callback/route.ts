import {cookies} from "next/headers";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {getSiteAccess} from "@/lib/permissions";
import {
  exchangeGscAuthorizationCode,
  getGscRedirectUri,
  GSC_READONLY_SCOPE,
} from "@/lib/google/gsc-oauth";
import {storeGoogleTokens} from "@/lib/google/google-auth";

const STATE_COOKIE = "RELIVA_GSC_OAUTH_STATE";

type StatePayload = {state: string; siteId: string};

function settingsRedirect(requestUrl: string, siteId: string, status: string) {
  const url = new URL(`/sites/${siteId}/settings`, requestUrl);
  url.searchParams.set("gsc", status);
  return Response.redirect(url);
}

function decodeStatePayload(value: string | undefined): StatePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<StatePayload>;
    return typeof parsed.state === "string" && typeof parsed.siteId === "string"
      ? {state: parsed.state, siteId: parsed.siteId}
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.redirect(new URL("/login", request.url));

  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const expected = decodeStatePayload(cookieStore.get(STATE_COOKIE)?.value);
  cookieStore.delete(STATE_COOKIE);

  if (!expected) {
    return Response.json({error: "Missing or invalid OAuth state"}, {status: 400});
  }

  const returnedState = requestUrl.searchParams.get("state");
  if (!returnedState || returnedState !== expected.state) {
    return settingsRedirect(request.url, expected.siteId, "state_error");
  }

  const access = await getSiteAccess(userId, expected.siteId);
  if (!access) {
    return Response.json({error: "Site not found or unauthorized"}, {status: 404});
  }

  if (requestUrl.searchParams.get("error")) {
    return settingsRedirect(request.url, expected.siteId, "denied");
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) return settingsRedirect(request.url, expected.siteId, "missing_code");

  try {
    const tokens = await exchangeGscAuthorizationCode({
      code,
      redirectUri: getGscRedirectUri(request.url),
    });
    await storeGoogleTokens(userId, tokens);

    if (access.organizationId) {
      await db.auditLog.create({
        data: {
          organizationId: access.organizationId,
          actorUserId: userId,
          action: "integration.google_search_console.authorized",
          entityType: "Site",
          entityId: expected.siteId,
          after: {
            provider: "google_search_console",
            scope: GSC_READONLY_SCOPE,
            permission: "read_only",
          },
        },
      });
    }

    return settingsRedirect(request.url, expected.siteId, "authorized");
  } catch (error) {
    console.error("Google Search Console OAuth callback failed", error);
    return settingsRedirect(request.url, expected.siteId, "error");
  }
}
