import { dateAt, dayCount, estimatedTotal, type Trip } from "@/lib/mvp/model";

export type FilmScene = {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: { title: string; detail: string }[];
};
export type FilmLabels = {
  day: (day: number) => string;
  empty: string;
  summary: string;
  budget: string;
  estimated: string;
  minutes: (n: number) => string;
  members: (n: number) => string;
};
export const FILM_WIDTH = 960,
  FILM_HEIGHT = 540,
  SCENE_SECONDS = 4;

/** Every day and activity is included; long days paginate rather than truncate. */
export function filmScenes(
  trip: Trip,
  locale: string,
  labels: FilmLabels,
): FilmScene[] {
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: trip.currency,
    }).format(n);
  const date = (day: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(dateAt(trip.start, day));
  const scenes: FilmScene[] = [
    {
      eyebrow: "TRIPIFY",
      title: trip.name,
      subtitle: trip.destination,
      rows: [
        {
          title: `${date(1)} — ${date(dayCount(trip.start, trip.end))}`,
          detail: trip.timezone,
        },
        {
          title: labels.members(trip.members.length),
          detail: `${labels.budget} · ${money(trip.budget)}`,
        },
      ],
    },
  ];
  for (let day = 1; day <= dayCount(trip.start, trip.end); day++) {
    const activities = trip.activities
      .filter((a) => a.day === day)
      .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
    for (let offset = 0; offset < Math.max(1, activities.length); offset += 4) {
      scenes.push({
        eyebrow: `${labels.day(day)}${activities.length > 4 ? ` · ${Math.floor(offset / 4) + 1}/${Math.ceil(activities.length / 4)}` : ""}`,
        title: trip.destination,
        subtitle: date(day),
        rows: activities.length
          ? activities
              .slice(offset, offset + 4)
              .map((a) => ({
                title: `${a.time}  ${a.title}`,
                detail: `${a.place} · ${labels.minutes(a.duration)} · ${money(a.cost)}`,
              }))
          : [{ title: labels.empty, detail: "" }],
      });
    }
  }
  scenes.push({
    eyebrow: "TRIPIFY",
    title: labels.summary,
    subtitle: trip.name,
    rows: [
      {
        title: `${labels.estimated} · ${money(estimatedTotal(trip))}`,
        detail: `${labels.budget} · ${money(trip.budget)}`,
      },
      {
        title: trip.destination,
        detail: `${date(1)} — ${date(dayCount(trip.start, trip.end))} · ${trip.timezone}`,
      },
    ],
  });
  return scenes;
}

export function drawFilmFrame(
  ctx: CanvasRenderingContext2D,
  scene: FilmScene,
  progress: number,
  index: number,
  count: number,
) {
  const w = FILM_WIDTH,
    h = FILM_HEIGHT;
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f4f7fd";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#dce7fa";
  ctx.lineWidth = 1;
  for (let x = 650; x < w + 200; x += 65) {
    ctx.beginPath();
    ctx.moveTo(x - 100, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.fillStyle = "#1765d8";
  ctx.fillRect(0, 0, 8, h);
  ctx.fillStyle = "#dce7fa";
  ctx.fillRect(42, h - 24, w - 84, 3);
  ctx.fillStyle = "#1765d8";
  ctx.fillRect(42, h - 24, ((w - 84) * (index + progress)) / count, 3);
  ctx.save();
  const enter = Math.min(1, progress / 0.15),
    exit = Math.min(1, (1 - progress) / 0.1);
  ctx.globalAlpha = Math.min(enter, exit);
  ctx.translate(0, (1 - enter) * 12);
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    maxWidth: number,
    weight = 400,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    // Fit full text, including long place names, rather than silently clipping it.
    const width = ctx.measureText(value).width;
    if (width > maxWidth)
      ctx.font = `${weight} ${Math.max(11, (size * maxWidth) / width)}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    ctx.fillText(value, x, y, maxWidth);
  };
  text(scene.eyebrow, 42, 52, 14, "#1765d8", 870, 700);
  text(scene.title, 42, 104, 36, "#142641", 870, 700);
  text(scene.subtitle, 42, 138, 17, "#536781", 870);
  scene.rows.forEach((row, i) => {
    const y = 164 + i * 78;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(42, y, 876, 67, 10);
    ctx.fill();
    ctx.fillStyle = "#e7f0ff";
    ctx.beginPath();
    ctx.arc(65, y + 24, 6, 0, Math.PI * 2);
    ctx.fill();
    text(row.title, 84, y + 25, 19, "#142641", 812, 600);
    text(row.detail, 84, y + 49, 14, "#536781", 812);
  });
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.font = '12px "Segoe UI",sans-serif';
  ctx.fillStyle = "#536781";
  ctx.fillText(`${index + 1} / ${count}`, 870, 500);
}

export async function exportTripFilm(
  scenes: FilmScene[],
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  const {
    Output,
    BufferTarget,
    Mp4OutputFormat,
    WebMOutputFormat,
    CanvasSource,
    canEncodeVideo,
  } = await import("mediabunny");
  signal.throwIfAborted();
  const dimensions = { width: FILM_WIDTH, height: FILM_HEIGHT };
  const codec = (await canEncodeVideo("avc", dimensions))
    ? "avc"
    : (await canEncodeVideo("vp9", dimensions))
      ? "vp9"
      : null;
  if (!codec) throw new Error("VIDEO_UNSUPPORTED");
  const canvas = document.createElement("canvas");
  canvas.width = FILM_WIDTH;
  canvas.height = FILM_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("VIDEO_UNSUPPORTED");
  const target = new BufferTarget();
  const output = new Output({
    format: codec === "avc" ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });
  const source = new CanvasSource(canvas, { codec, bitrate: 2_000_000 });
  output.addVideoTrack(source, { frameRate: 24 });
  try {
    await document.fonts.ready;
    await output.start();
    const frames = scenes.length * SCENE_SECONDS * 24;
    for (let frame = 0; frame < frames; frame++) {
      signal.throwIfAborted();
      const position = frame / (SCENE_SECONDS * 24),
        index = Math.floor(position);
      drawFilmFrame(ctx, scenes[index], position - index, index, scenes.length);
      await source.add(frame / 24, 1 / 24);
      if (frame % 12 === 0) {
        onProgress(frame / frames);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    signal.throwIfAborted();
    source.close();
    await output.finalize();
    signal.throwIfAborted();
    if (!target.buffer) throw new Error("VIDEO_EMPTY");
    onProgress(1);
    return {
      blob: new Blob([target.buffer], {
        type: codec === "avc" ? "video/mp4" : "video/webm",
      }),
      extension: codec === "avc" ? "mp4" : "webm",
    };
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  }
}
