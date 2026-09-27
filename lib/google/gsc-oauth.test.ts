import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {
  createGscAuthorizationUrl,
  getGscRedirectUri,
  GSC_READONLY_SCOPE,
} from "./gsc-oauth";

describe("Google Search Console OAuth", () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousRedirect = process.env.GOOGLE_GSC_REDIRECT_URI;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client.example";
    delete process.env.GOOGLE_GSC_REDIRECT_URI;
  });

  afterEach(() => {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousRedirect === undefined) delete process.env.GOOGLE_GSC_REDIRECT_URI;
    else process.env.GOOGLE_GSC_REDIRECT_URI = previousRedirect;
  });

  it("requests only Search Console read-only access in the integration flow", () => {
    const redirectUri = getGscRedirectUri("https://reliva.example/settings");
    const url = createGscAuthorizationUrl({
      state: "state-123",
      redirectUri,
      loginHint: "employee@example.com",
    });

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe(GSC_READONLY_SCOPE);
    expect(url.searchParams.get("scope")).not.toContain("analytics");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://reliva.example/api/connections/google-search-console/callback"
    );
  });

  it("supports an explicitly configured stable redirect URI", () => {
    process.env.GOOGLE_GSC_REDIRECT_URI = "https://app.reliva.example/google/callback";
    expect(getGscRedirectUri("https://preview.example/settings")).toBe(
      "https://app.reliva.example/google/callback"
    );
  });
});
