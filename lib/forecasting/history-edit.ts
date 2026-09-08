import type { HistoricalMonth } from "./types";

export type HistoricalEditableKey = Exclude<keyof HistoricalMonth, "month" | "cash"> | "endingCash";

const incomeCashDirection: Partial<Record<HistoricalEditableKey, 1 | -1>> = {
  revenue: 1,
  payroll: -1,
  cloud: -1,
  marketing: -1,
  software: -1,
  other: -1,
};

export function updateHistoricalActual(history: HistoricalMonth[], monthIndex: number, key: HistoricalEditableKey, value: number): HistoricalMonth[] {
  const source = history[monthIndex];
  if (!source) return history;
  if (key === "endingCash") return history.map((month, index) => index === monthIndex ? { ...month, cash: value } : month);

  const previousValue = Number(source[key] ?? 0);
  const cashImpact = (value - previousValue) * (incomeCashDirection[key] ?? 0);
  return history.map((month, index) => {
    const next = index === monthIndex ? { ...month, [key]: value } : { ...month };
    if (cashImpact && index >= monthIndex) {
      next.cash += cashImpact;
      if (next.shareholdersEquity !== undefined) next.shareholdersEquity += cashImpact;
    }
    return next;
  });
}
