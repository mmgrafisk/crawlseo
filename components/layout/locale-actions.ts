"use server";

import {cookies} from "next/headers";

const supportedLocales = ["da", "en"] as const;
type Locale = (typeof supportedLocales)[number];

export async function setRelivaLocale(locale: Locale) {
  if (!supportedLocales.includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("RELIVA_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
