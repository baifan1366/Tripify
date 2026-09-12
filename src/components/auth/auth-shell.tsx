import { getTranslations } from "next-intl/server";
import { ArrowLeft, Check, Route, Sparkles, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localePath } from "@/lib/auth/paths";
import "./auth.css";

export async function AuthShell({ children, locale, path = "/sign-in" }: { children: React.ReactNode; locale: string; path?: string }) {
  const t = await getTranslations({ locale, namespace: "auth" });
  return <main className="auth-shell trip-app-theme">
    <section className="auth-main">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label={`Tripify · ${t("home")}`}>
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 10H40M24 10V39M8 37C15 20 32 38 40 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><circle cx="8" cy="37" r="4" fill="currentColor"/></svg>Tripify
        </Link>
        <nav className="auth-languages" aria-label={t("language")}>{(["en", "zh", "ms"] as const).map(l => <a key={l} href={localePath(l, path)} lang={l} aria-current={locale === l ? "page" : undefined}>{l === "zh" ? "中文" : l.toUpperCase()}</a>)}</nav>
      </header>
      <div className="auth-content">{children}</div>
      <footer className="auth-footer"><Link href="/"><ArrowLeft size={16} aria-hidden="true"/>{t("home")}</Link><span>© {new Date().getFullYear()} Tripify</span></footer>
    </section>
    <aside className="auth-story" aria-label={t("storyLabel")}>
      <div className="auth-story-top"><span><Route size={18} aria-hidden="true"/> {t("storyLabel")}</span><span>01 — 03</span></div>
      <div className="auth-story-copy"><h2>{t("storyTitle")}</h2><p>{t("storyBody")}</p></div>
      <div className="auth-route-art">
        <svg className="auth-route-line" viewBox="0 0 460 290" fill="none" aria-hidden="true"><path d="M35 50H300C435 50 435 145 300 145H145C25 145 25 245 165 245H415" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8"/><circle cx="35" cy="50" r="7" fill="currentColor"/><circle cx="415" cy="245" r="7" fill="currentColor"/></svg>
        {[Users, Sparkles, Check].map((Icon, i) => <div key={i} className={`auth-route-stop auth-route-stop-${i}`}><span className="auth-stop-icon"><Icon size={20} aria-hidden="true"/></span><div><span className="auth-step-index">0{i+1}</span><strong>{t(`steps.${i}`)}</strong></div></div>)}
      </div>
      <div className="auth-story-bottom"><span className="auth-people" aria-hidden="true"><i>A</i><i>B</i><i>C</i><i>✦</i></span><p>{t("human")}</p></div>
    </aside>
  </main>;
}
