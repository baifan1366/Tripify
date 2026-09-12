import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnv, isAuthConfigured } from "@/lib/env";

export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!isAuthConfigured()) return response;
  const env = getPublicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Preserve next-intl's rewrite and locale headers while forwarding fresh cookies.
          const overrides = new Set((response.headers.get("x-middleware-override-headers") ?? "").split(",").map(s => s.trim()).filter(Boolean));
          overrides.add("cookie");
          response.headers.set("x-middleware-override-headers", [...overrides].join(","));
          response.headers.set("x-middleware-request-cookie", request.headers.get("cookie") ?? "");
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
          response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
        },
      },
    },
  );

  // Do not remove: it refreshes an expired Supabase Auth session when one exists.
  await supabase.auth.getClaims();
  return response;
}
