"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authLocale, localePath } from "./paths";
import { authURL } from "./origin";

export async function confirmEmail(_previous: { error: boolean }, form: FormData) {
  const locale = authLocale(form.get("locale"));
  const tokenHash = form.get("token_hash");
  const type = form.get("type");
  if (typeof tokenHash !== "string" || !/^[a-f0-9]{32,128}$/i.test(tokenHash) || (type !== "email" && type !== "recovery")) return { error: true };
  try {
    const { error } = await (await createClient()).auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return { error: true };
  } catch { return { error: true }; }
  redirect(authURL(localePath(locale, type === "recovery" ? "/reset-password" : "/dashboard")));
}

export async function signOut(_previous: { error: boolean }, form: FormData) {
  const locale = authLocale(form.get("locale"));
  try {
    const { error } = await (await createClient()).auth.signOut({ scope: "local" });
    if (error) return { error: true };
  } catch { return { error: true }; }
  redirect(localePath(locale, "/sign-in"));
}
