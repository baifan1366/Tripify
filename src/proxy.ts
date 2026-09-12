import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";
import { authURL, getAuthOrigin } from "@/lib/auth/origin";

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Start auth on the callback's origin so session/PKCE cookies stay together.
  const isAuthRoute = /^\/(?:en\/|zh\/|ms\/)?(?:auth|sign-in|sign-up|forgot-password|reset-password)(?:\/|$)/.test(request.nextUrl.pathname);
  if (isAuthRoute && request.nextUrl.origin !== getAuthOrigin()) {
    const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      // Never replay passwords or Server Action bodies to another origin.
      return new NextResponse("Open the sign-in page on the configured authentication domain.", { status: 400, headers });
    }
    return NextResponse.redirect(authURL(request.nextUrl.pathname + request.nextUrl.search), { status: 307, headers });
  }
  const response = await updateSession(request, handleI18nRouting(request));
  if (/\/(?:auth|sign-in|sign-up|dashboard|forgot-password|reset-password)(?:\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
