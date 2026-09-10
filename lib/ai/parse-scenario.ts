import { scenarioPatchSchema, type ScenarioPatch } from "../forecasting/schema";

function parseMoney(raw: string): number {
  const normalized = raw.toLowerCase().replace(/[$,\s]/g, "");
  const multiplier = normalized.endsWith("m") ? 1_000_000 : normalized.endsWith("k") ? 1_000 : 1;
  return Number(normalized.replace(/[km]$/, "")) * multiplier;
}

function inferMonth(text: string): string | null {
  const exact = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (exact) return exact[0];
  const names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const found = names.findIndex((name) => text.toLowerCase().includes(name) || text.toLowerCase().includes(name.slice(0, 3)));
  if (found < 0) return null;
  const yearMatch = text.match(/20\d{2}/);
  return `${yearMatch?.[0] ?? "2027"}-${String(found + 1).padStart(2, "0")}`;
}

export function parseScenarioCommand(command: string): ScenarioPatch {
  const text = command.trim();
  const lower = text.toLowerCase();
  const patch: ScenarioPatch = {};

  const growth = lower.match(/(?:growth|revenue growth)[^\d]*(\d+(?:\.\d+)?)\s*%/);
  if (growth) patch.monthlyRevenueGrowth = Number(growth[1]) / 100;

  const cloud = lower.match(/cloud[^\d]*(\d+(?:\.\d+)?)\s*%/);
  if (cloud) patch.cloudPercentOfRevenue = Number(cloud[1]) / 100;

  const marketing = lower.match(/marketing[^$\d]*([$]?\d[\d,.]*\s*[km]?)/);
  if (marketing) patch.marketingMonthly = parseMoney(marketing[1]);

  const payroll = lower.match(/(?:base\s+)?payroll[^$\d]*([$]?\d[\d,.]*\s*[km]?)/);
  if (payroll) patch.basePayroll = parseMoney(payroll[1]);

  const software = lower.match(/software[^$\d]*([$]?\d[\d,.]*\s*[km]?)/);
  if (software) patch.softwareMonthly = parseMoney(software[1]);

  const other = lower.match(/other(?:\s+opex|\s+operating expenses)?[^$\d]*([$]?\d[\d,.]*\s*[km]?)/);
  if (other) patch.otherMonthly = parseMoney(other[1]);

  const funding = lower.match(/(?:raise|funding)[^$\d]*([$]?\d[\d,.]*\s*[km]?)/);
  const month = inferMonth(text);
  if (funding && month) patch.fundingEvents = [{ id: `fund-${month}`, amount: parseMoney(funding[1]), month }];

  const hire = lower.match(/hire\s+(?:(\d+)|one|two|three|four|five)\s+([a-z ]+?)(?:\s+in\s+|\s+at\s+)/);
  const salary = lower.match(/\bat\s+([$]?\d[\d,.]*\s*[km]?)/);
  if (hire && salary && month) {
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const countToken = hire[1] ?? Object.keys(words).find((word) => lower.includes(`hire ${word}`));
    const count = Number(countToken) || words[countToken ?? ""] || 1;
    patch.hires = [{ id: `hire-${month}-${Date.now()}`, role: hire[2].trim().replace(/s$/, ""), count, annualSalary: parseMoney(salary[1]), startMonth: month }];
  }

  return scenarioPatchSchema.parse(patch);
}
