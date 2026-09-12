"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sharedError } from "@/lib/trips/repository";
import { saveMemberPreferences } from "@/lib/trips/proposals";
import type { Member, Trip } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppButton, Field } from "@/components/mvp/primitives";

export function SharedPeople({ trip }: { trip: Trip }) {
  const t = useTranslations("shared");
  const { viewer, refreshTrips, setNotice } = useMvp();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const self = trip.members.find((m) => m.id === viewer.id) ?? null;
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
      {trip.members.map((member) => (
        <div className="shared-member" key={member.id}>
          <span className="mvp-avatar" aria-hidden="true">
            {member.name.slice(0, 1)}
          </span>
          <div>
            <strong>{member.name}</strong>
            <small>
              {member.id === viewer.id && t("you")}
              {member.id === trip.createdBy && ` · ${t("owner")}`}
            </small>
            {removing === member.id && (
              <p>{t("confirmRemove", { name: member.name })}</p>
            )}
          </div>
          {viewer.id === trip.createdBy && member.id !== viewer.id && (
            <div>
              {removing === member.id ? (
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
                    onClick={() => void remove(member.id)}
                  >
                    {t("remove")}
                  </AppButton>
                </>
              ) : (
                <AppButton
                  disabled={pending}
                  variant="outline"
                  onClick={() => setRemoving(member.id)}
                >
                  {t("remove")}
                </AppButton>
              )}
            </div>
          )}
        </div>
      ))}
      {viewer.id === trip.createdBy && (
        <div className="shared-invite">
          <AppButton disabled={pending} onClick={() => void invite()}>
            {t("invite")}
          </AppButton>
          {token && (
            <>
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
            </>
          )}
        </div>
      )}
      {pending && <p role="status">{t("pending")}</p>}
      {error && <p role="alert">{error}</p>}
      {self && <MemberPreferencesForm trip={trip} member={self} />}
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
  const [interests, setInterests] = useState(member.interests);
  const [dislikes, setDislikes] = useState(member.dislikes);
  const [food, setFood] = useState(member.food);
  const [pace, setPace] = useState(member.pace);
  const [budget, setBudget] = useState(String(member.budget || ""));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [budgetError, setBudgetError] = useState("");
  // Adopt server state after realtime refreshes unless the user is typing.
  useEffect(() => {
    setInterests(member.interests);
    setDislikes(member.dislikes);
    setFood(member.food);
    setPace(member.pace);
    setBudget(String(member.budget || ""));
  }, [member.interests, member.dislikes, member.food, member.pace, member.budget]);
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
    <details className="shared-join">
      <summary>{t("join")}</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
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
        />
        <AppButton type="submit" disabled={pending || !code.trim()}>
          {t("accept")}
        </AppButton>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
