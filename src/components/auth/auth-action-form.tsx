"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { confirmEmail, signOut } from "@/lib/auth/actions";

export function AuthActionForm({ tokenHash, type, logout = false, configured = true, buttonClassName }: { tokenHash?: string; type?: string; logout?: boolean; configured?: boolean; buttonClassName?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(logout ? signOut : confirmEmail, { error: false });
  return <form action={action} noValidate aria-busy={pending}>
    <input type="hidden" name="locale" value={locale}/>
    {!logout && <><input type="hidden" name="token_hash" value={tokenHash ?? ""}/><input type="hidden" name="type" value={type ?? ""}/></>}
    {state.error && <div className="auth-error" role="alert">{t(logout ? "signOutError" : "expired")}</div>}
    {!configured && <div className="auth-notice" role="status">{t("missing")}</div>}
    <Button className={buttonClassName ?? "auth-button auth-primary"} type="submit" disabled={pending || !configured}>{t(pending ? "working" : logout ? "signOut" : type === "recovery" ? "confirmReset" : "confirmButton")}</Button>
    {state.error && !logout && <Link className="auth-inline-link" href={type === "recovery" ? "/forgot-password" : "/sign-up"}>{t(type === "recovery" ? "submitForgot" : "signUpLink")}</Link>}
  </form>;
}
