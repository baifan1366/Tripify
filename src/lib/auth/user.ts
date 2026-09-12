import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/env";

export async function getAuthUser() {
  if (!isAuthConfigured()) return null;
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
