"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, Eye, EyeOff, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { localePath, safeAuthNext } from "@/lib/auth/paths";
import { authURL } from "@/lib/auth/origin";

export type AuthMode = "signIn" | "signUp" | "forgot" | "reset";

export function AuthForm({ mode, configured, next, initialError }: { mode: AuthMode; configured: boolean; next?: string; initialError?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState(initialError ? t(initialError === "oauth" ? "googleError" : "expired") : "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [emailSent, setEmailSent] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const isEntry = mode === "signIn" || mode === "signUp";
  const destination = safeAuthNext(next, locale);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function explain(err: { code?: string; status?: number }) {
    if (err.status === 429 || err.code?.includes("rate_limit")) return t("rateLimit");
    if (err.code === "weak_password") return t("weakPassword");
    if (err.code === "invalid_credentials" || err.code === "email_not_confirmed") return t("invalidCredentials");
    return t("generic");
  }

  async function run(task: () => Promise<void>) {
    if (lock.current || !configured) return;
    lock.current = true; setBusy(true); setError("");
    try { await task(); } catch { setError(t("network")); }
    finally { lock.current = false; setBusy(false); }
  }

  const confirmURL = () => authURL(localePath(locale, "/auth/confirm"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    const errors: Record<string, string> = {};
    if (mode === "signUp" && (!name || name.length > 80)) errors.name = t("invalidName");
    if (mode !== "reset" && !z.email().safeParse(email).success) errors.email = t("invalidEmail");
    if ((mode === "signUp" || mode === "reset") && password.length < 8) errors.password = t("invalidPassword");
    if (mode === "signIn" && !password) errors.password = t("requiredPassword");
    if ((mode === "signUp" || mode === "reset") && data.get("confirmPassword") !== password) errors.confirmPassword = t("mismatch");
    setFields(errors);
    if (Object.keys(errors).length) { form.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus(); return; }
    await run(async () => {
      const supabase = createClient();
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(explain(error)); return; }
        window.location.assign(authURL(destination));
      } else if (mode === "signUp") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: confirmURL(), data: { display_name: name, locale } } });
        if (error) { setError(explain(error)); return; }
        if (data.session) { window.location.assign(authURL(destination)); return; }
        setEmailSent(email); setSent(true); setCooldown(60); form.reset();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmURL() });
        if (error) { setError(explain(error)); return; }
        setEmailSent(email); setSent(true); form.reset();
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) { setError(explain(error)); return; }
        setSent(true); form.reset();
      }
    });
  }

  function google() {
    void run(async () => {
      const callback = new URL(authURL(localePath(locale, "/auth/callback")));
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
      if (error) setError(error.status === 429 ? t("rateLimit") : t("googleError"));
    });
  }

  function field(name: string, type: string, autoComplete: string) {
    const passwordField = type === "password";
    return <div className="auth-field" key={name}>
      <label htmlFor={name}>{t(name)}</label>
      <div className="auth-input-wrap"><input id={name} name={name} type={passwordField && show ? "text" : type} autoComplete={autoComplete} autoCapitalize={type === "email" ? "none" : undefined} spellCheck={type === "email" ? false : undefined} required disabled={busy} maxLength={name === "name" ? 80 : undefined} aria-invalid={!!fields[name]} aria-describedby={[fields[name] ? `${name}-error` : "", name === "password" && mode !== "signIn" ? "password-hint" : ""].filter(Boolean).join(" ") || undefined} onChange={() => { setFields(f => ({ ...f, [name]: "" })); setError(""); }}/>
      {passwordField && name === "password" && <button type="button" className="auth-password-toggle" onClick={() => setShow(s => !s)} aria-label={t(show ? "hide" : "show")} aria-pressed={show}>{show ? <EyeOff size={20}/> : <Eye size={20}/>}</button>}</div>
      {fields[name] && <p className="auth-field-error" id={`${name}-error`}>{fields[name]}</p>}
      {name === "password" && mode !== "signIn" && <p className="auth-hint" id="password-hint">{t("passwordHint")}</p>}
    </div>;
  }

  return <>
    <p className="auth-eyebrow">{t("eyebrow")}</p>
    <h1>{t(sent ? mode === "reset" ? "resetDone" : "checkInbox" : mode)}</h1>
    <p className="auth-intro" role={sent ? "status" : undefined}>{t(sent ? mode === "forgot" ? "resetSent" : mode === "reset" ? "human" : "sent" : `${mode}Intro`)}</p>
    {!configured && <div className="auth-notice" role="status">{t("missing")}</div>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {sent ? <div className="auth-sent">
      <span className="auth-mail-icon"><MailCheck size={32} aria-hidden="true"/></span>
      {emailSent && <strong>{emailSent}</strong>}
      {mode !== "reset" && <p>{t("spam")}</p>}
      {mode === "signUp" && <Button variant="outline" className="auth-button" disabled={busy || cooldown > 0} onClick={() => void run(async () => {
        const { error } = await createClient().auth.resend({ type: "signup", email: emailSent, options: { emailRedirectTo: confirmURL() } });
        setCooldown(60); if (error) setError(explain(error));
      })}>{cooldown ? t("resendWait", { seconds: cooldown }) : t("resend")}</Button>}
      {mode !== "reset" && <button type="button" className="auth-text-button" onClick={() => { setSent(false); setError(""); }}>{t("changeEmail")}</button>}
      <Link className="auth-inline-link" href={mode === "reset" ? "/dashboard" : "/sign-in"}>{t(mode === "reset" ? "dashboard" : "signInLink")} <ArrowRight size={16}/></Link>
    </div> : <>
      {isEntry && <><Button variant="outline" className="auth-button auth-google" disabled={!configured || busy} onClick={google}><GoogleMark/>{t("google")}</Button><div className="auth-divider"><span>{t("or")}</span></div></>}
      <form noValidate onSubmit={submit} aria-busy={busy} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }}>
        {mode === "signUp" && field("name", "text", "name")}
        {mode !== "reset" && field("email", "email", "email")}
        {mode !== "forgot" && field("password", "password", mode === "signIn" ? "current-password" : "new-password")}
        {(mode === "signUp" || mode === "reset") && field("confirmPassword", "password", "new-password")}
        {mode === "signIn" && <div className="auth-forgot"><Link href="/forgot-password">{t("forgotLink")}</Link></div>}
        <Button type="submit" className="auth-button auth-primary" disabled={!configured || busy} aria-busy={busy}>{busy ? <LoaderCircle className="auth-spin" size={18} aria-hidden="true"/> : null}{t(busy ? "working" : `submit${mode[0].toUpperCase()}${mode.slice(1)}`)}{!busy && <ArrowRight size={18} aria-hidden="true"/>}</Button>
      </form>
      <p className="auth-switch">{t(mode === "signIn" ? "noAccount" : "haveAccount")} <Link href={mode === "signIn" ? "/sign-up" : "/sign-in"}>{t(mode === "signIn" ? "signUpLink" : "signInLink")}</Link></p>
    </>}
    <p className="auth-security"><ShieldCheck size={16} aria-hidden="true"/>{t("privacyNote")}</p>
  </>;
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.81-1.76-5.6-4.13H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59C7.19 7.71 9.4 5.95 12 5.95Z"/></svg>;
}
