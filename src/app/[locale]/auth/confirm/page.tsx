import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthActionForm } from "@/components/auth/auth-action-form";
import { type AuthPageProps } from "@/components/auth/auth-page";
import { isAuthConfigured } from "@/lib/env";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: AuthPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("confirm")} | Tripify`, robots: { index: false, follow: false }, referrer: "no-referrer" as const };
}

export default async function ConfirmPage({ params, searchParams }: AuthPageProps) {
  const { locale } = await params;
  const { token_hash, type } = await searchParams;
  const t = await getTranslations({ locale, namespace: "auth" });
  const valid = typeof token_hash === "string" && /^[a-f0-9]{32,128}$/i.test(token_hash) && (type === "email" || type === "recovery");
  // GET renders only. Email scanners cannot consume a one-time token by previewing the link.
  return <AuthShell locale={locale}><p className="auth-eyebrow">{t("eyebrow")}</p><h1>{t("confirm")}</h1><p className="auth-intro">{t(valid ? "confirmIntro" : "expired")}</p>
    {valid ? <AuthActionForm tokenHash={token_hash} type={type} configured={isAuthConfigured()}/> : <Link className="auth-inline-link" href="/sign-in">{t("signInLink")}</Link>}
  </AuthShell>;
}
