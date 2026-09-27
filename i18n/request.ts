import {getRequestConfig} from "next-intl/server";

export const supportedLocales = ["da", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const defaultLocale: SupportedLocale = "da";

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: "Europe/Copenhagen",
  };
});
