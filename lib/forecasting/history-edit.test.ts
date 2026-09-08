import { describe, expect, it } from "vitest";
import { updateHistoricalActual } from "./history-edit";
import type { HistoricalMonth } from "./types";

const history: HistoricalMonth[] = [
  { month: "2026-01", revenue: 100, payroll: 50, cloud: 10, marketing: 5, software: 5, other: 5, cash: 500, shareholdersEquity: 450 },
  { month: "2026-02", revenue: 110, payroll: 50, cloud: 10, marketing: 5, software: 5, other: 5, cash: 535, shareholdersEquity: 485 },
];

describe("linked historical statement edits", () => {
  it("rolls a revenue change through cash and retained earnings", () => {
    const result = updateHistoricalActual(history, 0, "revenue", 120);
    expect(result[0]).toMatchObject({ revenue: 120, cash: 520, shareholdersEquity: 470 });
    expect(result[1]).toMatchObject({ cash: 555, shareholdersEquity: 505 });
  });

  it("rolls an expense increase through cash", () => {
    const result = updateHistoricalActual(history, 1, "payroll", 60);
    expect(result[0].cash).toBe(500);
    expect(result[1]).toMatchObject({ payroll: 60, cash: 525, shareholdersEquity: 475 });
  });
});
