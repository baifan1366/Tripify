import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-xl space-y-4 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground">✦ TRIPIFY</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("description")}</p>
      </section>
    </main>
  );
}
