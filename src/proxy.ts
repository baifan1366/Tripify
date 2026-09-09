import createIntlMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  return updateSession(request, handleI18nRouting(request));
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
