import { setRequestLocale } from "next-intl/server";
import { JourneyLanding } from "@/components/marketing/journey-landing";

export default async function HomePage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <JourneyLanding locale={locale} />;
}
