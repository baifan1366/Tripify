import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "ms"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
