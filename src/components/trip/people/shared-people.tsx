"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sharedError } from "@/lib/trips/repository";
import { saveMemberPreferences } from "@/lib/trips/proposals";
import type { Member, Trip } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppButton, Field } from "@/components/mvp/primitives";
import { AppPopover } from "@/components/ui/app-popover";
import { UsersRound } from "lucide-react";

export function SharedPeople({ trip }: { trip: Trip }) {
  const t = useTranslations("shared");
  const { viewer, refreshTrips, setNotice } = useMvp();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const self = trip.members.find((m) => m.id === viewer.id) ?? null;
  const selected =
    trip.members.find((m) => m.id === (selectedId ?? viewer.id)) ??
    trip.members[0] ??
    null;
  async function invite() {
    setPending(true);
    setError("");
    try {
      const result = await createClient().rpc("trip_invite_create", {
        p_trip: trip.id,
      });
      if (result.error) throw result.error;
      setToken(result.data.token);
    } catch (e) {
      setError(t(sharedError(e)));
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    setPending(true);
    setError("");
    try {
      const result = await createClient().rpc("trip_member_remove", {
        p_trip: trip.id,
        p_user: id,
      });
      if (result.error) throw result.error;
      setRemoving(null);
      await refreshTrips();
    } catch (e) {
      setError(t(sharedError(e)));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shared-panel" aria-label={t("people")}>
      <div className="people-rail" role="group" aria-label={t("people")}>
        {trip.members.map((member) => (
          <button
            key={member.id}
            type="button"
            className="people-chip"
            aria-pressed={selected?.id === member.id}
            onClick={() => {
              setSelectedId(member.id);
              setRemoving(null);
            }}
            title={member.name}
          >
            <span className="mvp-avatar" aria-hidden="true">
              {member.name.slice(0, 1)}
            </span>
            {member.name.split(" ")[0]}
          </button>
        ))}
        {viewer.id === trip.createdBy && (
          <AppPopover
            label={t("invite")}
            className="mvp-button people-invite-trigger"
            trigger={<>{t("invite")}</>}
            onOpenChange={(open) => {
              if (open && !token && !pending) void invite();
            }}
          >
            <div className="people-invite-popover">
              {" "}
              {token && (
                <div className="shared-invite">
                  <Field
                    label={t("code")}
                    value={token}
                    readOnly
                    onFocus={(e) => e.target.select()}
                    hint={t("inviteHint")}
                  />
                  <AppButton
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(token);
                        setNotice(t("copied"));
                      } catch {
                        setError(t("failed"));
                      }
                    }}
                  >
                    {t("copy")}
                  </AppButton>
                </div>
              )}
              {pending && <p role="status">{t("pending")}</p>}
              {error && <p role="alert">{error}</p>}
              {!token && !pending && (
                <AppButton variant="outline" onClick={() => void invite()}>
                  {t("retry")}
                </AppButton>
              )}
            </div>
          </AppPopover>
        )}
      </div>
      {selected && (
        <div className="people-detail">
          <div className="shared-member" key={selected.id}>
            <span className="mvp-avatar" aria-hidden="true">
              {selected.name.slice(0, 1)}
            </span>
            <div>
              <strong>{selected.name}</strong>
              <small>
                {selected.id === viewer.id && t("you")}
                {selected.id === trip.createdBy && ` · ${t("owner")}`}
              </small>
              {removing === selected.id && (
                <p>{t("confirmRemove", { name: selected.name })}</p>
              )}
            </div>
            {viewer.id === trip.createdBy && selected.id !== viewer.id && (
              <div>
                {removing === selected.id ? (
                  <>
                    <AppButton
                      disabled={pending}
                      variant="outline"
                      onClick={() => setRemoving(null)}
                    >
                      {t("cancel")}
                    </AppButton>
                    <AppButton
                      disabled={pending}
                      onClick={() => void remove(selected.id)}
                    >
                      {t("remove")}
                    </AppButton>
                  </>
                ) : (
                  <AppButton
                    disabled={pending}
                    variant="outline"
                    onClick={() => setRemoving(selected.id)}
                  >
                    {t("remove")}
                  </AppButton>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {pending && <p role="status">{t("pending")}</p>}
      {error && <p role="alert">{error}</p>}
      {self && selected?.id === self.id && (
        <MemberPreferencesForm trip={trip} member={self} />
      )}
    </section>
  );
}

function MemberPreferencesForm({
  trip,
  member,
}: {
  trip: Trip;
  member: Member;
}) {
  const m = useTranslations("mvp");
  const t = useTranslations("shared");
  const { refreshTrips, setNotice } = useMvp();
  const [edits, setEdits] = useState<
    Partial<{
      interests: string;
      dislikes: string;
      food: string;
      pace: Member["pace"];
      budget: string;
    }>
  >({});
  const interests = edits.interests ?? member.interests,
    dislikes = edits.dislikes ?? member.dislikes,
    food = edits.food ?? member.food,
    pace = edits.pace ?? member.pace,
    budget = edits.budget ?? String(member.budget || "");
  const setInterests = (value: string) =>
    setEdits((e) => ({ ...e, interests: value }));
  const setDislikes = (value: string) =>
    setEdits((e) => ({ ...e, dislikes: value }));
  const setFood = (value: string) => setEdits((e) => ({ ...e, food: value }));
  const setPace = (value: Member["pace"]) =>
    setEdits((e) => ({ ...e, pace: value }));
  const setBudget = (value: string) =>
    setEdits((e) => ({ ...e, budget: value }));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [budgetError, setBudgetError] = useState("");
  // Untouched fields follow realtime data; typed values survive background refreshes.
  async function save(event: FormEvent) {
    event.preventDefault();
    const parsedBudget = budget.trim() === "" ? null : Number(budget);
    if (parsedBudget !== null && !/^\d+(\.\d{1,2})?$/.test(budget.trim())) {
      setBudgetError(m("invalidBudget"));
      return;
    }
    setPending(true);
    setError("");
    setBudgetError("");
    try {
      await saveMemberPreferences(trip.id, {
        interests: interests.trim(),
        dislikes: dislikes.trim(),
        food_preferences: food.trim(),
        pace,
        budget_limit: parsedBudget,
      });
      setNotice(t("saved"));
      await refreshTrips();
    } catch (e) {
      setError(t(sharedError(e)));
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="mvp-card mvp-preferences-form" noValidate onSubmit={save}>
      <h3>
        {m("editPreferences")} · {member.name}
      </h3>
      <p className="mvp-muted">{m("preferenceIntro")}</p>
      <Field
        label={m("interests")}
        value={interests}
        maxLength={400}
        onChange={(e) => setInterests(e.target.value)}
      />
      <Field
        label={m("dislikes")}
        value={dislikes}
        maxLength={400}
        onChange={(e) => setDislikes(e.target.value)}
      />
      <Field
        label={m("food")}
        value={food}
        maxLength={400}
        onChange={(e) => setFood(e.target.value)}
      />
      <Field
        label={`${m("memberBudget")} (${trip.currency})`}
        type="number"
        min="0"
        step="0.01"
        value={budget}
        error={budgetError}
        onChange={(e) => {
          setBudget(e.target.value);
          setBudgetError("");
        }}
      />
      <fieldset className="mvp-pace">
        <legend>{m("pace")}</legend>
        {(["slow", "balanced", "active"] as const).map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="shared-pace"
              checked={pace === option}
              onChange={() => setPace(option)}
            />
            {m(option)}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <AppButton type="submit" disabled={pending}>
        {t("save")}
      </AppButton>
    </form>
  );
}

export function AcceptInvite() {
  const t = useTranslations("shared");
  const { viewer, refreshTrips, setNotice } = useMvp();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppPopover
      label={t("join")}
      className="mvp-button join-trip-trigger"
      trigger={
        <>
          <UsersRound size={17} />
          {t("join")}
        </>
      }
    >
      {(close) => (
        <form
          className="shared-join-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending) return;
            if (!/^[a-f0-9]{64}$/i.test(code.trim())) {
              setError(t("invalidInvite"));
              e.currentTarget.querySelector("input")?.focus();
              return;
            }
            setPending(true);
            setError("");
            try {
              const result = await createClient().rpc("trip_invite_accept", {
                p_token: code.trim(),
                p_display_name: viewer.name,
              });
              if (result.error) throw result.error;
              setCode("");
              setNotice(t("joined"));
              await refreshTrips();
              close();
            } catch (err) {
              setError(t(sharedError(err)));
            } finally {
              setPending(false);
            }
          }}
        >
          <Field
            label={t("code")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            minLength={64}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            error={error}
          />
          <AppButton type="submit" disabled={pending || !code.trim()}>
            {t("accept")}
          </AppButton>
          {pending && <p role="status">{t("pending")}</p>}
        </form>
      )}
    </AppPopover>
  );
}
