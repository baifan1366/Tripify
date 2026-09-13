"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Film, Share2 } from "lucide-react";
import { AppPopover } from "@/components/ui/app-popover";
import { AppButton } from "@/components/mvp/primitives";
import type { Trip } from "@/lib/mvp/model";
import {
  drawFilmFrame,
  exportTripFilm,
  filmScenes,
  FILM_WIDTH,
  FILM_HEIGHT,
  SCENE_SECONDS,
} from "@/lib/trips/video";

export function ShareTripVideo({ trip }: { trip: Trip }) {
  const t = useTranslations("dock");
  return (
    <AppPopover
      label={t("shareTrip")}
      className="mvp-share-trigger"
      trigger={
        <>
          <Share2 size={16} />
          {t("shareTrip")}
        </>
      }
    >
      <FilmExporter trip={trip} />
    </AppPopover>
  );
}

function FilmExporter({ trip }: { trip: Trip }) {
  const t = useTranslations("dock"),
    m = useTranslations("mvp"),
    shared = useTranslations("shared"),
    locale = useLocale();
  const canvas = useRef<HTMLCanvasElement>(null),
    abort = useRef<AbortController | null>(null),
    url = useRef<string | null>(null);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const [result, setResult] = useState<{
    url: string;
    extension: string;
  } | null>(null);
  const scenes = filmScenes(trip, locale, {
    day: (day) => m("day", { day }),
    empty: t("filmEmpty"),
    summary: t("filmSummary"),
    budget: m("budget"),
    estimated: m("currentEstimate"),
    minutes: (count) => m("minutes", { count }),
    members: (count) => m("members", { count }),
  });
  // Preview follows live trip data. An export takes its own immutable scene snapshot.
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawFilmFrame(ctx, scenes[0], 0.5, 0, scenes.length);
  });
  useEffect(
    () => () => {
      abort.current?.abort();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  async function generate() {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setProgress(0);
    setError("");
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
    setResult(null);
    try {
      const film = await exportTripFilm(scenes, controller.signal, setProgress);
      controller.signal.throwIfAborted();
      url.current = URL.createObjectURL(film.blob);
      setResult({ url: url.current, extension: film.extension });
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          t(
            e instanceof Error && e.message === "VIDEO_UNSUPPORTED"
              ? "filmUnsupported"
              : "filmFailed",
          ),
        );
    } finally {
      abort.current = null;
      setBusy(false);
    }
  }
  return (
    <div className="trip-film-panel">
      <p>{t("filmIntro")}</p>
      {result ? (
        <video
          src={result.url}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = 0.5;
          }}
          controls
          playsInline
          aria-label={t("filmPreview")}
        />
      ) : (
        <canvas
          ref={canvas}
          width={FILM_WIDTH}
          height={FILM_HEIGHT}
          role="img"
          aria-label={t("filmPreview")}
        />
      )}
      <p className="mvp-muted">
        {t("filmLength", { seconds: scenes.length * SCENE_SECONDS })}
      </p>
      {busy && (
        <div role="status">
          <progress value={progress} max={1} aria-label={t("filmExport")} />
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="trip-film-actions">
        {busy ? (
          <AppButton variant="outline" onClick={() => abort.current?.abort()}>
            {shared("cancel")}
          </AppButton>
        ) : (
          <AppButton onClick={() => void generate()}>
            <Film size={16} />
            {t("filmExport")}
          </AppButton>
        )}
        {result && (
          <a
            className="mvp-link-button"
            href={result.url}
            download={`${trip.name.replace(/[^\p{L}\p{N}_-]/gu, "_") || "tripify"}.${result.extension}`}
          >
            <Download size={16} />
            {t("filmDownload")}
          </a>
        )}
      </div>
    </div>
  );
}
