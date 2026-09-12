import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthUser } from "@/lib/auth/user";
import { localePath } from "@/lib/auth/paths";
import { MvpView } from "./mvp-view";
export type MvpPageProps = {
  params: Promise<{ locale: string; path?: string[] }>;
};
export async function mvpMetadata(props: MvpPageProps) {
  const { locale, path = [] } = await props.params;
  const t = await getTranslations({ locale, namespace: "mvp" });
  const key =
    path[0] === "account"
      ? "account"
      : path[0] === "preferences"
        ? "preferences"
        : path[1] === "new"
          ? "create"
          : path[0] === "trips"
            ? "workspace"
            : "myTrips";
  return {
    title: `${t(key)} | Tripify`,
    robots: { index: false, follow: false },
  };
}
export async function MvpPage({
  demo = false,
  params,
}: MvpPageProps & { demo?: boolean }) {
  const { locale, path = [] } = await params;
  if (
    !(
      path.length === 0 ||
      (path.length === 1 && ["preferences", "account"].includes(path[0])) ||
      (path.length === 2 && path[0] === "trips" && /^[a-z0-9-]+$/.test(path[1]))
    )
  )
    notFound();
  if (!demo && !(await getAuthUser()))
    redirect(
      `${localePath(locale, "/sign-in")}?next=${encodeURIComponent(localePath(locale, `/dashboard${path.length ? `/${path.join("/")}` : ""}`))}`,
    );
  return <MvpView path={path} />;
}
