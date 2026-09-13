"use client";
import { useTranslations } from "next-intl";

export function WorkspacePreview() {
  const t = useTranslations("mvp");
  return (
    <aside className="trip-workspace-preview">
      <span className="mvp-eyebrow">Tripify</span>
      <h2>{t("previewTitle")}</h2>
      <p>{t("previewBody")}</p>
      <svg viewBox="0 0 520 350" role="img" aria-label={t("previewBody")}>
        <rect
          x="5"
          y="5"
          width="510"
          height="340"
          rx="18"
          fill="var(--card)"
          stroke="var(--border)"
        />
        <path d="M45 5V345M45 45H515" stroke="var(--border)" />
        <circle cx="25" cy="25" r="7" fill="var(--primary)" />
        <rect
          x="61"
          y="20"
          width="100"
          height="8"
          rx="4"
          fill="var(--foreground)"
          opacity=".65"
        />
        <g className="preview-journey">
          <rect
            x="60"
            y="60"
            width="186"
            height="168"
            rx="10"
            fill="var(--muted)"
          />
          <text x="74" y="82">
            {t("plan")}
          </text>
          {[105, 145, 185].map((y, i) => (
            <g key={y} className={`preview-stop preview-stop-${i}`}>
              <circle cx="78" cy={y + 8} r="5" fill="var(--primary)" />
              <rect
                x="91"
                y={y}
                width={126 - i * 17}
                height="6"
                rx="3"
                fill="var(--foreground)"
                opacity=".6"
              />
              <rect
                x="91"
                y={y + 13}
                width="72"
                height="4"
                rx="2"
                fill="var(--muted-foreground)"
                opacity=".4"
              />
            </g>
          ))}
        </g>
        <rect
          x="258"
          y="60"
          width="240"
          height="168"
          rx="10"
          fill="var(--accent)"
        />
        <path
          d="M270 185L475 80M300 70L460 215M265 140L490 153M368 65L346 218"
          stroke="var(--card)"
          strokeWidth="12"
        />
        <path
          className="preview-route"
          d="M295 185Q340 170 340 130T425 104L465 170"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {[
          [295, 185],
          [340, 130],
          [425, 104],
          [465, 170],
        ].map(([x, y], i) => (
          <circle
            className={`preview-stop preview-stop-${i}`}
            key={x}
            cx={x}
            cy={y}
            r="6"
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth="2"
          />
        ))}
        <rect
          x="60"
          y="241"
          width="438"
          height="87"
          rx="10"
          fill="var(--muted)"
        />
        <text x="74" y="265">
          Tripify AI
        </text>
        <rect
          className="preview-answer"
          x="74"
          y="277"
          width="310"
          height="5"
          rx="2.5"
          fill="var(--muted-foreground)"
          opacity=".5"
        />
        <rect
          x="74"
          y="295"
          width="408"
          height="22"
          rx="11"
          fill="var(--card)"
          stroke="var(--border)"
        />
        <circle cx="469" cy="306" r="7" fill="var(--primary)" />
      </svg>
      <ol>
        <li>{t("previewStepPlan")}</li>
        <li>{t("previewStepMap")}</li>
        <li>{t("previewStepAi")}</li>
      </ol>
    </aside>
  );
}
