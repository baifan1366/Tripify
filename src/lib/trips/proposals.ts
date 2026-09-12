import { createClient } from "@/lib/supabase/client";
import type { Activity, Trip } from "@/lib/mvp/model";
import { activityData } from "@/lib/trips/repository";

export type ProposalOperation =
  | "activity.add"
  | "activity.update"
  | "activity.remove";

export type ProposalChangeInput = {
  operation: ProposalOperation;
  entityId?: string;
  data: Partial<ReturnType<typeof activityData>>;
};

export type ProposalChangeRow = {
  id: string;
  proposal_id: string;
  ordinal: number;
  operation: ProposalOperation;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
};

export type ProposalVoteRow = {
  proposal_id: string;
  user_id: string;
  vote: "approve" | "reject";
  reason: string;
  updated_at: string;
};

export type ProposalRow = {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  reason: string;
  base_trip_version: number;
  status: "open" | "applied" | "cancelled";
  applied_version: number | null;
  created_at: string;
  applied_at: string | null;
  proposal_changes: ProposalChangeRow[];
  proposal_votes: ProposalVoteRow[];
};

const proposalColumns = `id,trip_id,created_by,title,reason,base_trip_version,status,applied_version,created_at,applied_at,
  proposal_changes(id,proposal_id,ordinal,operation,entity_id,old_value,new_value),
  proposal_votes(proposal_id,user_id,vote,reason,updated_at)`;

export async function loadProposals(tripId: string): Promise<ProposalRow[]> {
  const { data, error } = await createClient()
    .from("proposals")
    .select(proposalColumns)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as ProposalRow[];
}

export async function createSharedProposal(
  trip: Trip,
  title: string,
  reason: string,
  changes: ProposalChangeInput[],
): Promise<string> {
  const { data, error } = await createClient().rpc("trip_proposal_create", {
    p_trip: trip.id,
    p_expected: trip.version,
    p_title: title,
    p_reason: reason,
    p_changes: changes.map((change) => ({
      operation: change.operation,
      entityId: change.entityId ?? "",
      data: change.data,
    })),
  });
  if (error) throw error;
  return data as string;
}

export async function sharedProposalAction(
  proposalId: string,
  action: "approve" | "reject" | "apply" | "cancel",
  reason = "",
): Promise<Record<string, unknown>> {
  const { data, error } = await createClient().rpc("trip_proposal_action", {
    p_proposal: proposalId,
    p_action: action,
    p_reason: reason,
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function saveProposalDraft(
  tripId: string,
  content: string,
): Promise<void> {
  const { saveDraft } = await import("@/lib/trips/drafts");
  await saveDraft(tripId, "proposal", content);
}

export async function loadProposalDraft(
  tripId: string,
): Promise<string | null> {
  const { loadDraft } = await import("@/lib/trips/drafts");
  return loadDraft(tripId, "proposal");
}

export async function saveMemberPreferences(
  tripId: string,
  data: {
    interests?: string;
    dislikes?: string;
    food_preferences?: string;
    pace?: "slow" | "balanced" | "active";
    budget_limit?: number | null;
    display_name?: string;
  },
): Promise<void> {
  const { error } = await createClient().rpc("trip_member_preferences", {
    p_trip: tripId,
    p_data: data,
  });
  if (error) throw error;
}

export function changeActivityData(activity: Activity, edits: {
  day?: number;
  time?: string;
  title?: string;
  place?: string;
  cost?: number;
}): Partial<ReturnType<typeof activityData>> {
  return activityData({ ...activity, ...edits });
}
