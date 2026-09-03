export function money(value: number, compact = true): string {
  const sign = value < 0 ? "−" : "";
  const amount = Math.abs(value);
  if (compact && amount >= 1_000_000) return `${sign}$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 2)}M`;
  if (compact && amount >= 1_000) return `${sign}$${Math.round(amount / 1_000)}k`;
  return `${sign}$${Math.round(amount).toLocaleString("en-US")}`;
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(value * 100 % 1 ? 1 : 0)}%`;
}

export function monthLabel(value: string, includeYear = false): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: includeYear ? "2-digit" : undefined, timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
