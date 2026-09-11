"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  Send,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  applyDemoCompromise,
  estimatedTotal,
  exampleTrip,
  type Trip,
} from "@/lib/mvp/model";
import { useMvp } from "./mvp-provider";
import { AppButton, Field, EmptyState } from "./primitives";

export function ChatPanel({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const { base, messages, setMessages, viewer } = useMvp();
  const [text, setText] = useState("");
  function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setMessages((all) => ({
      ...all,
      [trip.id]: [
        ...(all[trip.id] ?? []),
        {
          id: crypto.randomUUID(),
          author: viewer.name || t("you"),
          text: text.trim(),
        },
      ],
    }));
    setText("");
  }
  return (
    <>
      <div className="mvp-panel-heading">
        <h2>
          <span className="mvp-ai-mark">✦</span>
          {t("teamAI")}
        </h2>
        <span className="mvp-tag">{t("demo")}</span>
      </div>
      <div className="mvp-chat-messages">
        <p className="mvp-chat-intro">{t("human")}</p>
        {trip.demo && (
          <div className="mvp-chat-bubble">
            <span className="mvp-avatar">C</span>
            <div>
              <strong>
                Charlie <small>· {t("demo")}</small>
              </strong>
              <p>{t("aiExample")}</p>
            </div>
          </div>
        )}
        <article className="mvp-ai-message">
          <span className="mvp-eyebrow">✦ {t("preview")}</span>
          <h3>{t("aiIntro")}</h3>
          <p>{t("chatNote")}</p>
          {trip.demo && (
            <>
              <div className="mvp-ai-mini-proposal">
                <span>
                  <Clock3 size={14} />
                  {t("day", { day: 3 })}
                </span>
                <strong>{t("proposalTitle")}</strong>
                <div>
                  <span>11.2 → 6.1 km</span>
                  <span>82 → 91</span>
                </div>
              </div>
              <Link
                className="mvp-inline-link"
                href={`${base}/trips/${trip.id}?view=decisions`}
              >
                {t("viewProposal")}
                <ArrowRight size={15} />
              </Link>
              <details className="mvp-evidence">
                <summary>{t("research")}</summary>
                <p>{t("evidence")}</p>
              </details>
            </>
          )}
        </article>
        {(messages[trip.id] ?? []).map((message) => (
          <div key={message.id} className="mvp-chat-bubble mvp-chat-own">
            <span className="mvp-avatar">{message.author.slice(0, 1)}</span>
            <div>
              <strong>{message.author}</strong>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form className="mvp-composer" noValidate onSubmit={send}>
        <label htmlFor={`message-${trip.id}`}>{t("message")}</label>
        <textarea
          className="resize-none"
          id={`message-${trip.id}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={2000}
        />
        <div>
          <span>{t("unsaved")}</span>
          <AppButton
            type="submit"
            disabled={!text.trim()}
            aria-label={t("send")}
          >
            <Send size={16} />
          </AppButton>
        </div>
      </form>
    </>
  );
}

export function ProposalPanel({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const locale = useLocale();
  const { proposal, setProposal, updateTrip, setNotice, setMessages, viewer } =
    useMvp();
  const [reason, setReason] = useState("");
  if (!trip.demo)
    return (
      <EmptyState title={t("noProposals")} description={t("noProposalsBody")}>
        <Link
          href="/demo/trips/tokyo?view=decisions"
          className="mvp-link-button"
        >
          {t("openDemo")}
        </Link>
      </EmptyState>
    );
  const stale =
    proposal !== "applied" &&
    JSON.stringify(trip.activities) !==
      JSON.stringify(exampleTrip().activities);
  const sample = exampleTrip();
  const dayCost = (value: Trip) => value.activities.filter(item => item.day === 3).reduce((sum, item) => sum + item.cost, 0);
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: sample.currency }).format(value);
  return (
    <div className="mvp-decision-layout">
      <section className="mvp-card mvp-proposal">
        <div className="mvp-proposal-heading">
          <span className="mvp-eyebrow">
            ✦ {t("teamAI")} · {t("demo")}
          </span>
          <span className={`mvp-tag mvp-state-${proposal}`}>{t(proposal)}</span>
        </div>
        <h2>{t("proposalTitle")}</h2>
        <p>{t("proposalReason")}</p>
        <div className="mvp-diff">
          <div>
            <h3>{t("before")}</h3>
            <p>
              <span>09:00</span> teamLab Borderless
            </p>
            <p>
              <span>14:00</span> Shibuya Sky
            </p>
            <p className="mvp-diff-remove">− 16:00 Shibuya shopping</p>
          </div>
          <div>
            <h3>{t("after")}</h3>
            <p>
              <span>09:30</span> teamLab Borderless
            </p>
            <p className="mvp-diff-add">+ 13:00 Café break</p>
            <p>
              <span>15:00</span> Shibuya Sky
            </p>
          </div>
        </div>
        <div className="mvp-proposal-metrics">
          <div>
            <small>{t("walking")}</small>
            <strong>
              11.2 <span>→</span> 6.1 <small>km</small>
            </strong>
          </div>
          <div>
            <small>{t("day", { day: 3 })} · {t("cost")}</small>
            <strong>
              {money(dayCost(sample))} <span>→</span> {money(dayCost(applyDemoCompromise(sample)))}
            </strong>
          </div>
          <div>
            <small>{t("groupFit")}</small>
            <strong>
              82 <span>→</span> 91
            </strong>
          </div>
        </div>
        <p className="mvp-hint">{t("voteRule")}</p>
        {stale && (
          <p className="mvp-error" role="status">
            {t("proposalStale")}
          </p>
        )}
        <div className="mvp-voters">
          {["Alice", "Bob", "David"].map((name) => (
            <span key={name}>
              <Check size={14} />
              {name}
            </span>
          ))}
          <span>
            {proposal === "approved" || proposal === "applied" ? (
              <Check size={14} />
            ) : (
              <Clock3 size={14} />
            )}
            Charlie
          </span>
        </div>
        {proposal === "voting" && (
          <div className="mvp-form-actions">
            <AppButton
              variant="outline"
              disabled={stale}
              onClick={() => setProposal("rejected")}
            >
              {t("reject")}
            </AppButton>
            <AppButton disabled={stale} onClick={() => setProposal("approved")}>
              <Check size={16} />
              {t("approve")}
            </AppButton>
          </div>
        )}
        {proposal === "approved" && (
          <AppButton
            disabled={stale}
            onClick={() => {
              updateTrip(applyDemoCompromise(trip));
              setProposal("applied");
              setNotice(t("applied"));
            }}
          >
            <CheckCheck size={16} />
            {t("apply")}
          </AppButton>
        )}
        {proposal === "applied" && (
          <p className="mvp-success" role="status">
            <CheckCheck size={18} />
            {t("applied")}
          </p>
        )}
        <button
          type="button"
          className="mvp-text-button"
          onClick={() => {
            updateTrip({ ...trip, activities: exampleTrip().activities });
            setProposal("voting");
          }}
        >
          {t("resetDemo")}
        </button>
      </section>
      <aside className="mvp-decision-aside">
        <section className="mvp-card">
          <Sparkles size={24} />
          <h3>{t("human")}</h3>
          <p>{t("reasonHint")}</p>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!reason.trim()) return;
              setMessages((all) => ({
                ...all,
                [trip.id]: [
                  ...(all[trip.id] ?? []),
                  {
                    id: crypto.randomUUID(),
                    author: viewer.name || t("you"),
                    text: reason.trim(),
                  },
                ],
              }));
              setNotice(t("saved"));
              setReason("");
            }}
          >
            <label htmlFor="proposal-reason">{t("reason")}</label>
            <textarea
              id="proposal-reason"
              className="resize-none"
              rows={5}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <AppButton
              variant="outline"
              type="submit"
              disabled={!reason.trim()}
            >
              {t("send")}
            </AppButton>
          </form>
        </section>
        <section className="mvp-card">
          <h3>{t("research")}</h3>
          <p>{t("evidence")}</p>
        </section>
      </aside>
    </div>
  );
}

export function BudgetPanel({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const locale = useLocale();
  const planned = estimatedTotal(trip);
  const forecast = trip.demo ? planned + 640 : null;
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: trip.currency,
      maximumFractionDigits: 2,
    }).format(n);
  return (
    <section className="mvp-budget-page">
      <p className="mvp-eyebrow">{t("budget")}</p>
      <h2>{t("budgetIntro")}</h2>
      <div className="mvp-budget-grid">
        <article className="mvp-card mvp-budget-overview">
          <Wallet size={26} />
          <p>{t("currentEstimate")}</p>
          <strong>{money(planned)}</strong>
          <span> / {money(trip.budget)}</span>
          <div
            className="mvp-budget-track"
            role="meter"
            aria-label={t("budget")}
            aria-valuemin={0}
            aria-valuemax={trip.budget || 1}
            aria-valuenow={Math.min(planned, trip.budget || 1)}
            aria-valuetext={`${money(planned)} / ${money(trip.budget)}`}
          >
            <span
              style={{
                width: `${Math.min(100, trip.budget > 0 ? (planned / trip.budget) * 100 : planned > 0 ? 100 : 0)}%`,
              }}
            />
          </div>
          <div className="mvp-budget-row">
            <span>{t(planned > trip.budget ? "overBudget" : "remaining")}</span>
            <strong>{money(Math.abs(trip.budget - planned))}</strong>
          </div>
          <p className="mvp-hint">{t("estimateNote")}</p>
        </article>
        <article className="mvp-card mvp-forecast">
          <span className="mvp-eyebrow">✦ {t("forecast")}</span>
          <strong>{forecast === null ? "—" : money(forecast)}</strong>
          <p>
            {forecast === null
              ? t("noForecast")
              : `${t("forecastRemaining")}: ${money(Math.max(0, trip.budget - forecast))}`}
          </p>
          <span className="mvp-tag">{t(trip.demo ? "demo" : "unknown")}</span>
        </article>
      </div>
      <section className="mvp-card mvp-cost-list">
        <h3>{t("cost")}</h3>
        {trip.activities.length ? (
          trip.activities.map((activity) => (
            <div className="mvp-cost-row" key={activity.id}>
              <span>
                <small>{t("day", { day: activity.day })}</small>
                {activity.title}
              </span>
              <strong>{money(activity.cost)}</strong>
            </div>
          ))
        ) : (
          <p className="mvp-muted">{t("noActivitiesBody")}</p>
        )}
      </section>
    </section>
  );
}

export function PeoplePanel({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const { updateTrip, setNotice } = useMvp();
  const member =
    trip.members.find((m) => m.id === (trip.demo ? "charlie" : "me")) ??
    trip.members[0];
  const [budget, setBudget] = useState(String(member.budget));
  const [budgetError, setBudgetError] = useState("");
  function update(key: string, value: string | number) {
    updateTrip({
      ...trip,
      members: trip.members.map((m) =>
        m.id === member.id ? { ...m, [key]: value } : m,
      ),
    });
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d+(\.\d{1,2})?$/.test(budget) || !Number.isFinite(Number(budget))) {
      setBudgetError(t("invalidBudget"));
      event.currentTarget
        .querySelector<HTMLInputElement>("[name=memberBudget]")
        ?.focus();
      return;
    }
    update("budget", Number(budget));
    setBudgetError("");
    setNotice(t("saved"));
  }
  return (
    <section>
      <p className="mvp-eyebrow">{t("people")}</p>
      <h2 className="mvp-detail-title">{t("memberIntro")}</h2>
      <div className="mvp-member-grid">
        {trip.members.map((person) => (
          <article className="mvp-card mvp-member" key={person.id}>
            <span className="mvp-avatar">{person.name.slice(0, 1)}</span>
            <h3>{person.name}</h3>
            <p>{person.interests || t("unknown")}</p>
            <span className="mvp-tag">{t(person.pace)}</span>
          </article>
        ))}
      </div>
      <div className="mvp-people-layout">
        <form
          className="mvp-card mvp-preferences-form"
          noValidate
          onSubmit={save}
        >
          <h3>
            {t("editPreferences")} · {member.name}
          </h3>
          <p className="mvp-muted">{t("preferenceIntro")}</p>
          <Field
            label={t("interests")}
            value={member.interests}
            maxLength={400}
            onChange={(event) => update("interests", event.target.value)}
          />
          <Field
            label={t("dislikes")}
            value={member.dislikes}
            maxLength={400}
            onChange={(event) => update("dislikes", event.target.value)}
          />
          <Field
            label={t("food")}
            value={member.food}
            maxLength={400}
            onChange={(event) => update("food", event.target.value)}
          />
          <Field
            label={`${t("memberBudget")} (${trip.currency})`}
            name="memberBudget"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            error={budgetError}
            onChange={(event) => {
              setBudget(event.target.value);
              setBudgetError("");
              if (
                /^\d+(\.\d{1,2})?$/.test(event.target.value) &&
                Number.isFinite(Number(event.target.value))
              )
                update("budget", Number(event.target.value));
            }}
          />
          <fieldset className="mvp-pace">
            <legend>{t("pace")}</legend>
            {(["slow", "balanced", "active"] as const).map((pace) => (
              <label key={pace}>
                <input
                  type="radio"
                  name="pace"
                  checked={member.pace === pace}
                  onChange={() => update("pace", pace)}
                />
                {t(pace)}
              </label>
            ))}
          </fieldset>
          <p className="mvp-hint">{t("previewNote")}</p>
          <AppButton type="submit">{t("save")}</AppButton>
        </form>
        <aside className="mvp-card mvp-invite-note">
          <h3>{t("people")}</h3>
          <p>{t("inviteNote")}</p>
          <p>{t("reasonHint")}</p>
        </aside>
      </div>
    </section>
  );
}
