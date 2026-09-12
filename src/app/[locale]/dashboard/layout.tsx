import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/user";
import { localePath } from "@/lib/auth/paths";
import { MvpProvider } from "@/components/mvp/mvp-provider";
import { MvpShell } from "@/components/mvp/mvp-shell";
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();
  if (!user)
    redirect(
      `${localePath(locale, "/sign-in")}?next=${encodeURIComponent(localePath(locale, "/dashboard"))}`,
    );
  const name = user.user_metadata.display_name ?? user.user_metadata.full_name;
  return (
    <MvpProvider
      demo={false}
      viewer={{
        name: typeof name === "string" ? name : "Tripify",
        email: user.email ?? "",
      }}
    >
      <MvpShell>{children}</MvpShell>
    </MvpProvider>
  );
}
