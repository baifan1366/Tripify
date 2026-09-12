import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  return {
    locale,
    messages: {
      ...(await import(`../messages/${locale}.json`)).default,
      auth: (await import(`../messages/auth/${locale}.json`)).default,
      mvp: (await import(`../messages/mvp/${locale}.json`)).default,
      dock: (await import(`../messages/dock/${locale}.json`)).default,
      shared: (await import(`../messages/shared/${locale}.json`)).default,
    },
  };
});
