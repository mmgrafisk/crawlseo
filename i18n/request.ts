import {cookies} from "next/headers";
import {getRequestConfig} from "next-intl/server";

export const supportedLocales = ["da", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "da";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get("RELIVA_LOCALE")?.value;
  const locale = supportedLocales.includes(requestedLocale as SupportedLocale)
    ? (requestedLocale as SupportedLocale)
    : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: "Europe/Copenhagen",
  };
});
