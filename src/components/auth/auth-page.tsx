import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "./auth-shell";
import { AuthForm, type AuthMode } from "./auth-form";
import { isAuthConfigured } from "@/lib/env";
import { getAuthUser } from "@/lib/auth/user";
import { localePath, safeAuthNext } from "@/lib/auth/paths";

export type AuthPageProps = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function authMetadata(props: AuthPageProps, mode: AuthMode) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t(mode)} | Tripify`, robots: { index: false, follow: false } };
}

export async function AuthPage({ mode, ...props }: AuthPageProps & { mode: AuthMode }) {
  const { locale } = await props.params;
  const query = await props.searchParams;
  const user = await getAuthUser();
  const next = safeAuthNext(query.next, locale);
  if (user && (mode === "signIn" || mode === "signUp")) redirect(next);
  if (!user && mode === "reset") redirect(`${localePath(locale, "/forgot-password")}?error=expired`);
  const paths = { signIn: "/sign-in", signUp: "/sign-up", forgot: "/forgot-password", reset: "/reset-password" };
  return <AuthShell locale={locale} path={paths[mode]}><AuthForm mode={mode} configured={isAuthConfigured()} next={next} initialError={typeof query.error === "string" ? query.error : undefined}/></AuthShell>;
}
