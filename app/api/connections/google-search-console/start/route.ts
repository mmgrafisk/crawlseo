import {randomBytes} from "node:crypto";
import {cookies} from "next/headers";
import {auth} from "@/lib/auth";
import {canManageSite, getSiteAccess} from "@/lib/permissions";
import {
  createGscAuthorizationUrl,
  getGscRedirectUri,
} from "@/lib/google/gsc-oauth";

const STATE_COOKIE = "RELIVA_GSC_OAUTH_STATE";
const STATE_TTL_SECONDS = 10 * 60;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.redirect(new URL("/login", request.url));

  const requestUrl = new URL(request.url);
  const siteId = requestUrl.searchParams.get("siteId");
  if (!siteId) {
    return Response.json({error: "Missing siteId"}, {status: 400});
  }

  const access = await getSiteAccess(userId, siteId);
  if (!access) {
    return Response.json({error: "Site not found or unauthorized"}, {status: 404});
  }
  if (!canManageSite(access.role)) {
    return Response.json({error: "Admin access required to connect Search Console"}, {status: 403});
  }

  const state = randomBytes(32).toString("base64url");
  const statePayload = Buffer.from(JSON.stringify({state, siteId}), "utf8").toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/connections/google-search-console",
    maxAge: STATE_TTL_SECONDS,
  });

  const redirectUri = getGscRedirectUri(request.url);
  const authorizationUrl = createGscAuthorizationUrl({
    state,
    redirectUri,
    loginHint: session.user?.email,
  });

  return Response.redirect(authorizationUrl);
}
