import type { Assumptions, HistoricalMonth } from "./types";

export function assumptionsFromHistory(base: Assumptions, history: HistoricalMonth[]): Assumptions {
  const last = history[history.length - 1];
  if (!last) return base;
  const spend = last.cloud + last.software;
  return {
    ...base,
    startingMonth: last.month,
    startingCash: last.cash,
    startingRevenue: last.revenue,
    accountsReceivablePercentOfRevenue: last.accountsReceivable !== undefined && last.revenue ? last.accountsReceivable / last.revenue : base.accountsReceivablePercentOfRevenue,
    accountsPayablePercentOfSpend: last.accountsPayable !== undefined && spend ? last.accountsPayable / spend : base.accountsPayablePercentOfSpend,
    startingPrepaids: last.prepaids ?? base.startingPrepaids,
    startingFixedAssets: last.fixedAssets ?? base.startingFixedAssets,
    startingDebt: last.debt ?? base.startingDebt,
  };
}
