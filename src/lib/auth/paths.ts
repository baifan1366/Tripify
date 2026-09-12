export function authLocale(value: unknown): "en" | "zh" | "ms" {
  return value === "zh" || value === "ms" ? value : "en";
}

export function localePath(locale: string, path: string) {
  return `${locale === "en" ? "" : `/${authLocale(locale)}`}${path}` || "/";
}

// Only implemented, protected destinations are allowed. Never redirect to an arbitrary URL.
export function safeAuthNext(value: unknown, locale: string) {
  const fallback = localePath(locale, "/dashboard");
  return typeof value === "string" && /^\/(?:zh\/|ms\/)?dashboard(?:\/(?:account|preferences|trips\/[a-z0-9-]+))?$/.test(value) ? value : fallback;
}
