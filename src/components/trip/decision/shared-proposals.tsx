"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCheck, Clock3, Plus, Vote, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sharedError } from "@/lib/trips/repository";
import {
  createSharedProposal,
  loadProposalDraft,
  loadProposals,
  saveProposalDraft,
  sharedProposalAction,
  type ProposalRow,
} from "@/lib/trips/proposals";
import type { Trip } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppButton, EmptyState, Field } from "@/components/mvp/primitives";

/** Live proposal list with realtime + focus/poll revalidation. */
export function useProposals(tripId: string, enabled: boolean) {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const failCount = useRef(0);
  const refresh = useCallback(async (): Promise<boolean> => {
    const request = ++generation.current;
    try {
      const result = await loadProposals(tripId);
      if (request === generation.current) {
        setProposals(result);
        setError(false);
        failCount.current = 0;
      }
      return true;
    } catch {
      if (request === generation.current) {
        setError(true);
        failCount.current++;
      }
      return false;
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [tripId]);
  // The browser client is a singleton, and RealtimeClient.channel() returns
  // the existing channel for a repeated topic. A per-instance suffix keeps
  // simultaneous hooks (feed + decisions panel) and StrictMode remounts from
  // calling .on() on an already-subscribed channel. Filters still scope rows.
  const instance = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const client = createClient();
    let channel: ReturnType<typeof client.channel> | null = null;
    try {
      channel = client
        .channel(`proposals:${tripId}:${instance.current}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "proposals",
            filter: `trip_id=eq.${tripId}`,
          },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "proposal_votes" },
          () => void refresh(),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void refresh();
        });
    } catch {
      channel = null;
    }
    // Realtime first; poll as backup with backoff on failures. Hidden tabs skip.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!document.hidden) void refresh();
      const delay = Math.min(
        60000,
        15000 * 2 ** Math.min(failCount.current, 2),
      );
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 15000);
    const reload = () => void refresh();
    window.addEventListener("focus", reload);
    return () => {
      generation.current++;
      clearTimeout(timer);
      window.removeEventListener("focus", reload);
      if (channel) void client.removeChannel(channel).catch(() => {});
    };
  }, [enabled, tripId, refresh]);
  return { proposals, loading, error, refresh };
}

type ProposalsStore = ReturnType<typeof useProposals>;
const ProposalsContext = createContext<ProposalsStore | null>(null);

/** Single live proposal feed per trip; DecisionFeed and Decisions share it. */
export function ProposalsProvider({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  const store = useProposals(tripId, true);
  return (
    <ProposalsContext.Provider value={store}>
      {children}
    </ProposalsContext.Provider>
  );
}

/**
 * Reads the shared feed when mounted under ProposalsProvider, otherwise
 * falls back to a local feed (e.g. isolated test fixtures without provider).
 */
export function useSharedProposals(tripId: string): ProposalsStore {
  const shared = useContext(ProposalsContext);
  const local = useProposals(tripId, !shared);
  return shared ?? local;
}

function fieldLabel(
  t: (key: string) => string,
  key: string,
): string | undefined {
  const mapped = {
    day_number: "field_day_number",
    start_time: "field_start_time",
    title: "field_title",
    location_name: "field_location_name",
    estimated_cost: "field_estimated_cost",
  }[key];
  return mapped ? t(mapped) : undefined;
}

function changeSummary(
  t: (key: string) => string,
  change: ProposalRow["proposal_changes"][number],
): string {
  const before = change.old_value;
  const after = change.new_value;
  const parts: string[] = [];
  const keys = new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})]);
  for (const key of ["day_number", "start_time", "title", "location_name", "estimated_cost"]) {
    if (!keys.has(key)) continue;
    const oldText = String(before?.[key] ?? "—");
    const newText = String(after?.[key] ?? "—");
    if (oldText === newText) continue;
    const label = fieldLabel(t, key) ?? key;
    parts.push(`${label}: ${oldText} → ${newText}`);
  }
  const prefix =
    change.operation === "activity.add"
      ? `+ ${t("op_activity_add")}`
      : change.operation === "activity.remove"
        ? `− ${t("op_activity_remove")}`
        : t("op_activity_update");
  return `${prefix}${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
}

function ProposalCard({
  trip,
  proposal,
  onRefresh,
}: {
  trip: Trip;
  proposal: ProposalRow;
  onRefresh: () => Promise<unknown>;
}) {
  const t = useTranslations("shared");
  const { viewer, refreshTrips, setNotice } = useMvp();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const memberIds = new Set(trip.members.map((m) => m.id));
  const votes = proposal.proposal_votes.filter((v) => memberIds.has(v.user_id));
  const approvals = votes.filter((v) => v.vote === "approve");
  const majority = approvals.length * 2 > trip.members.length;
  const myVote = votes.find((v) => v.user_id === viewer.id)?.vote;
  const stale =
    proposal.status === "open" &&
    trip.version !== proposal.base_trip_version;
  const canAct = proposal.status === "open" && !stale;
  async function act(
    action: "approve" | "reject" | "apply" | "cancel",
    voteReason = "",
  ) {
    setPending(true);
    setError("");
    try {
      await sharedProposalAction(proposal.id, action, voteReason);
      if (action === "apply") {
        setNotice(t("proposalApplied"));
        await refreshTrips();
      }
      setReason("");
      await onRefresh();
    } catch (e) {
      setError(t(sharedError(e)));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mvp-card mvp-proposal">
      <div className="mvp-proposal-heading">
        <span className="mvp-eyebrow">
          ✦ <Vote size={12} aria-hidden="true" /> {t("proposal")} ·{" "}
          {t(`proposal_${proposal.status}`)}
        </span>
        <span
          className={`mvp-tag mvp-state-${proposal.status === "open" ? "voting" : proposal.status}`}
        >
          {t(`proposal_${proposal.status}`)}
        </span>
      </div>
      <h3>{proposal.title}</h3>
      <p>{proposal.reason}</p>
      <div className="mvp-diff">
        <div>
          <h4>{t("changes")}</h4>
          {proposal.proposal_changes
            .slice()
            .sort((a, b) => a.ordinal - b.ordinal)
            .map((change) => (
              <p
                key={change.id}
                className={
                  change.operation === "activity.add"
                    ? "mvp-diff-add"
                    : change.operation === "activity.remove"
                      ? "mvp-diff-remove"
                      : undefined
                }
              >
                {changeSummary(t, change)}
              </p>
            ))}
        </div>
      </div>
      {stale && (
        <p className="mvp-error" role="status">
          {t("proposalStale")}
        </p>
      )}
      <p className="mvp-hint">
        {t("voteRule", {
          yes: approvals.length,
          total: trip.members.length,
        })}
      </p>
      <div className="mvp-voters">
        {trip.members.map((member) => {
          const vote = votes.find((v) => v.user_id === member.id);
          return (
            <span key={member.id}>
              {vote?.vote === "approve" ? (
                <Check size={14} />
              ) : vote?.vote === "reject" ? (
                <X size={14} />
              ) : (
                <Clock3 size={14} />
              )}
              {member.name}
            </span>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}
      {canAct && (
        <>
          {!myVote && (
            <div className="mvp-form-actions">
              <AppButton
                variant="outline"
                disabled={pending}
                onClick={() => void act("reject", reason)}
              >
                <X size={16} /> {t("reject")}
              </AppButton>
              <AppButton
                disabled={pending}
                onClick={() => void act("approve", reason)}
              >
                <Check size={16} /> {t("approve")}
              </AppButton>
            </div>
          )}
          {myVote && (
            <p className="mvp-muted" role="status">
              {t(myVote === "approve" ? "youApproved" : "youRejected")}
            </p>
          )}
          <label htmlFor={`vote-reason-${proposal.id}`}>{t("reason")}</label>
          <textarea
            id={`vote-reason-${proposal.id}`}
            className="resize-none"
            rows={2}
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {viewer.id === trip.createdBy && (
            <div className="mvp-form-actions">
              <AppButton
                variant="outline"
                disabled={pending}
                onClick={() => void act("cancel")}
              >
                {t("cancel")}
              </AppButton>
              <AppButton
                disabled={pending || !majority}
                onClick={() => void act("apply")}
              >
                <CheckCheck size={16} /> {t("apply")}
              </AppButton>
            </div>
          )}
        </>
      )}
      {proposal.status === "applied" && (
        <p className="mvp-success" role="status">
          <CheckCheck size={18} /> {t("proposalApplied")} ·{" "}
          {t("version", { version: proposal.applied_version ?? "" })}
        </p>
      )}
    </section>
  );
}

export function SharedProposals({ trip }: { trip: Trip }) {
  const t = useTranslations("shared");
  const m = useTranslations("mvp");
  const { setNotice } = useMvp();
  const { proposals, loading, error, refresh } = useSharedProposals(trip.id);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<"activity.update" | "activity.add">(
    "activity.update",
  );
  const [day, setDay] = useState("1");
  const [time, setTime] = useState("09:00");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [cost, setCost] = useState("0");
  const draftTouched = useRef(false);
  const activities = trip.activities
    .slice()
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  useEffect(() => {
    loadProposalDraft(trip.id)
      .then((content) => {
        if (content && !draftTouched.current) setReason(content);
      })
      .catch(() => {});
  }, [trip.id]);
  useEffect(() => {
    if (!draftTouched.current) return;
    const timer = window.setTimeout(() => {
      void saveProposalDraft(trip.id, reason).catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [reason, trip.id]);
  useEffect(() => {
    const chosen = activities.find((a) => a.id === target);
    if (chosen) {
      setDay(String(chosen.day));
      setTime(chosen.time);
      setName(chosen.title);
      setPlace(chosen.place);
      setCost(String(chosen.cost));
    }
    // Populate fields when the target changes; typing must not be reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const numberCost = Number(cost);
    if (
      !title.trim() ||
      !reason.trim() ||
      !/^\d+(\.\d{1,2})?$/.test(cost) ||
      !Number.isFinite(numberCost) ||
      (mode === "activity.update" && !target) ||
      !name.trim() ||
      !place.trim()
    ) {
      setFormError(t("invalidProposal"));
      return;
    }
    setPending(true);
    setFormError("");
    const data = {
      day_number: Number(day),
      start_time: time,
      title: name.trim(),
      location_name: place.trim(),
      duration_minutes: 60,
      estimated_cost: numberCost,
    };
    createSharedProposal(trip, title.trim(), reason.trim(), [
      {
        operation: mode,
        entityId: mode === "activity.update" ? target : undefined,
        data,
      },
    ])
      .then(async () => {
        setTitle("");
        setReason("");
        setTarget("");
        draftTouched.current = false;
        void saveProposalDraft(trip.id, "").catch(() => {});
        setNotice(t("proposalCreated"));
        await refresh();
      })
      .catch((e) => setFormError(t(sharedError(e))))
      .finally(() => setPending(false));
  }
  if (loading)
    return (
      <section className="shared-panel" aria-busy="true">
        <p role="status">{t("loadingProposals")}</p>
      </section>
    );
  return (
    <div className="mvp-decision-layout">
      <section>
        <div className="mvp-form-actions">
          <AppButton
            variant={creating ? "outline" : "default"}
            onClick={() => setCreating((open) => !open)}
          >
            <Plus size={16} /> {t("newProposal")}
          </AppButton>
          {error && (
            <AppButton variant="outline" onClick={() => void refresh()}>
              {t("retry")}
            </AppButton>
          )}
        </div>
        {creating && (
          <form className="mvp-card mvp-proposal" noValidate onSubmit={submit}>
            <h3>{t("newProposal")}</h3>
            <Field
              label={t("proposalTitleLabel")}
              value={title}
              maxLength={160}
              required
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="mvp-form-actions">
              {(["activity.update", "activity.add"] as const).map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="proposal-mode"
                    checked={mode === option}
                    onChange={() => {
                      setMode(option);
                      setTarget("");
                    }}
                  />
                  {t(`op_${option.replace(".", "_")}`)}
                </label>
              ))}
            </div>
            {mode === "activity.update" ? (
              <div className="mvp-field">
                <label htmlFor={`proposal-target-${trip.id}`}>
                  {t("chooseActivity")}
                </label>
                <select
                  id={`proposal-target-${trip.id}`}
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                >
                  <option value="">—</option>
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {m("day", { day: activity.day })} · {activity.time} ·{" "}
                      {activity.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Field
              label={t("field_day_number")}
              type="number"
              min="1"
              value={day}
              required
              onChange={(event) => setDay(event.target.value)}
            />
            <Field
              label={t("field_start_time")}
              type="time"
              value={time}
              required
              onChange={(event) => setTime(event.target.value)}
            />
            <Field
              label={t("field_title")}
              value={name}
              maxLength={160}
              required
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              label={t("field_location_name")}
              value={place}
              maxLength={200}
              required
              onChange={(event) => setPlace(event.target.value)}
            />
            <Field
              label={`${t("field_estimated_cost")} (${trip.currency})`}
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
            <div className="mvp-field">
              <label htmlFor={`proposal-reason-${trip.id}`}>
                {t("reason")}
              </label>
              <textarea
                id={`proposal-reason-${trip.id}`}
                className="resize-none"
                rows={3}
                maxLength={4000}
                value={reason}
                required
                onChange={(event) => {
                  draftTouched.current = true;
                  setReason(event.target.value);
                }}
              />
            </div>
            {formError && <p role="alert">{formError}</p>}
            <AppButton type="submit" disabled={pending}>
              {t("create")}
            </AppButton>
            <p className="mvp-hint">{t("proposalHint")}</p>
          </form>
        )}
        {proposals.length ? (
          proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              trip={trip}
              proposal={proposal}
              onRefresh={refresh}
            />
          ))
        ) : (
          !creating && (
            <EmptyState
              title={t("noProposals")}
              description={t("noProposalsBody")}
            />
          )
        )}
      </section>
      <aside className="mvp-decision-aside">
        <section className="mvp-card">
          <h3>{t("human")}</h3>
          <p>{t("proposalRuleNote")}</p>
        </section>
      </aside>
    </div>
  );
}
