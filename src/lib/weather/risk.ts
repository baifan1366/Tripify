export type RiskLevel = "low" | "medium" | "high";

export type WeatherDay = {
  date: string;
  tmaxC: number | null;
  tminC: number | null;
  precipProbPct: number | null;
  windKmh: number | null;
  code: number | null;
  risk: RiskLevel;
  summary: string;
};

const STORM_CODES = new Set([95, 96, 99]);

/** Pure day-level risk from Open-Meteo daily aggregates. */
export function assessRisk(
  precipProbPct: number | null,
  windKmh: number | null,
  code: number | null,
): RiskLevel {
  if (code != null && STORM_CODES.has(code)) return "high";
  if (
    (precipProbPct != null && precipProbPct >= 60) ||
    (windKmh != null && windKmh >= 50)
  )
    return "high";
  if (
    (precipProbPct != null && precipProbPct >= 30) ||
    (windKmh != null && windKmh >= 30)
  )
    return "medium";
  return "low";
}
