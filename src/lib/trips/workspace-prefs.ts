"use client";
import { createClient } from "@/lib/supabase/client";
import {
  parseLayout,
  type WorkspaceLayout,
} from "@/lib/mvp/workspace-layout";

export async function loadWorkspaceLayout(): Promise<WorkspaceLayout | null> {
  try {
    const client = createClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await client
      .from("user_workspace_preferences")
      .select("layout")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error || !data?.layout) return null;
    return parseLayout(data.layout);
  } catch {
    return null;
  }
}

export async function saveWorkspaceLayout(
  layout: WorkspaceLayout,
): Promise<boolean> {
  try {
    const client = createClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return false;
    const { error } = await client
      .from("user_workspace_preferences")
      .upsert({ user_id: auth.user.id, layout }, { onConflict: "user_id" });
    return !error;
  } catch {
    return false;
  }
}
