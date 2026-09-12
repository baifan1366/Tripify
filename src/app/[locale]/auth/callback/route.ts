import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authLocale, localePath, safeAuthNext } from "@/lib/auth/paths";

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const locale = authLocale((await params).locale);
  const code = request.nextUrl.searchParams.get("code");
  const next = safeAuthNext(request.nextUrl.searchParams.get("next"), locale);
  if (code && !request.nextUrl.searchParams.has("error")) {
    try {
      const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, request.url), { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    } catch { /* Show a safe localized error, never the provider's raw response or token. */ }
  }
  return NextResponse.redirect(new URL(`${localePath(locale, "/sign-in")}?error=oauth`, request.url), { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
