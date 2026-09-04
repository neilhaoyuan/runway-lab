import { assumptionsSchema } from "./schema";
import type { Assumptions, ForecastMonth, ForecastResult, MonthlyForecastOverride } from "./types";

export function addMonths(month: string, amount: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return (ey - sy) * 12 + em - sm;
}

export function calculateRunway(months: ForecastMonth[], horizon: number): Pick<ForecastResult, "runwayMonths" | "runwayLabel"> {
  const depletedIndex = months.findIndex((month) => month.endingCash <= 0);
  if (depletedIndex === -1) return { runwayMonths: null, runwayLabel: `>${horizon} months` };
  const previousCash = depletedIndex === 0 ? months[0].endingCash - months[0].netCashFlow : months[depletedIndex - 1].endingCash;
  const loss = Math.max(1, previousCash - months[depletedIndex].endingCash);
  const fraction = Math.max(0, Math.min(1, previousCash / loss));
  const runwayMonths = Math.round((depletedIndex + fraction) * 10) / 10;
  return { runwayMonths, runwayLabel: `${runwayMonths.toFixed(1)} months` };
}

export function forecast(rawAssumptions: Assumptions, horizon = 12, overrides: MonthlyForecastOverride[] = []): ForecastResult {
  const assumptions = assumptionsSchema.parse(rawAssumptions);
  let revenue = assumptions.startingRevenue;
  let cash = assumptions.startingCash;
  const arPercent = assumptions.accountsReceivablePercentOfRevenue ?? .5;
  const apPercent = assumptions.accountsPayablePercentOfSpend ?? .5;
  let accountsReceivable = revenue * arPercent;
  let prepaids = assumptions.startingPrepaids ?? 20_000;
  let fixedAssets = assumptions.startingFixedAssets ?? 150_000;
  let accountsPayable = (revenue * assumptions.cloudPercentOfRevenue + assumptions.softwareMonthly) * apPercent;
  let accruedExpenses = assumptions.basePayroll * .25;
  let debt = assumptions.startingDebt ?? 0;
  let workingCapital = accountsReceivable + prepaids - accountsPayable - accruedExpenses;
  let shareholdersEquity = cash + accountsReceivable + prepaids + fixedAssets - accountsPayable - accruedExpenses - debt;
  const months: ForecastMonth[] = [];
  const simulationHorizon = Math.max(horizon, 60);

  for (let index = 0; index < simulationHorizon; index += 1) {
    const month = addMonths(assumptions.startingMonth, index + 1);
    const override = overrides[index] ?? {};
    const revenueGrowth = override.revenueGrowth ?? assumptions.monthlyRevenueGrowth;
    revenue *= 1 + revenueGrowth;
    const activeHires = assumptions.hires.filter((hire) => monthsBetween(hire.startMonth, month) >= 0);
    const hirePayroll = activeHires.reduce((sum, hire) => sum + (hire.annualSalary * hire.count) / 12, 0);
    const payroll = override.payroll ?? assumptions.basePayroll + hirePayroll;
    const cloud = override.cloud ?? revenue * assumptions.cloudPercentOfRevenue;
    const marketing = override.marketing ?? assumptions.marketingMonthly;
    const software = override.software ?? assumptions.softwareMonthly;
    const other = override.other ?? assumptions.otherMonthly;
    const depreciation = Math.min(fixedAssets, assumptions.monthlyDepreciation ?? 5_000);
    const costOfRevenue = cloud;
    const grossProfit = revenue - costOfRevenue;
    const operatingExpenses = payroll + marketing + software + other + depreciation;
    const totalExpenses = costOfRevenue + operatingExpenses;
    const netIncome = revenue - totalExpenses;

    const nextAccountsReceivable = override.accountsReceivable ?? revenue * arPercent;
    const nextAccountsPayable = override.accountsPayable ?? (cloud + software) * apPercent;
    const nextAccruedExpenses = payroll * .25;
    const nextWorkingCapital = nextAccountsReceivable + prepaids - nextAccountsPayable - nextAccruedExpenses;
    const changeInWorkingCapital = nextWorkingCapital - workingCapital;
    const operatingCashFlow = netIncome + depreciation - changeInWorkingCapital;
    const capitalExpenditures = override.capitalExpenditures ?? assumptions.monthlyCapex ?? 0;
    const investingCashFlow = -capitalExpenditures;
    const fundingEvents = assumptions.fundingEvents.filter((event) => event.month === month);
    const funding = override.funding ?? fundingEvents.reduce((sum, event) => sum + event.amount, 0);
    const financingCashFlow = funding;
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    cash += netCashFlow;
    fixedAssets = Math.max(0, fixedAssets + capitalExpenditures - depreciation);
    accountsReceivable = nextAccountsReceivable;
    accountsPayable = nextAccountsPayable;
    accruedExpenses = nextAccruedExpenses;
    workingCapital = nextWorkingCapital;
    shareholdersEquity += netIncome + funding;
    const totalAssets = cash + accountsReceivable + prepaids + fixedAssets;
    const totalLiabilities = accountsPayable + accruedExpenses + debt;
    const liabilitiesAndEquity = totalLiabilities + shareholdersEquity;
    const events = [
      ...activeHires.filter((hire) => hire.startMonth === month).map((hire) => `${hire.count}× ${hire.role}`),
      ...fundingEvents.map((event) => `Funding +$${Math.round(event.amount / 1000)}k`),
    ];
    months.push({
      month,
      index,
      revenue,
      revenueGrowth,
      payroll,
      cloud,
      marketing,
      software,
      other,
      totalExpenses,
      costOfRevenue,
      grossProfit,
      operatingExpenses,
      depreciation,
      netIncome,
      accountsReceivable,
      prepaids,
      fixedAssets,
      totalAssets,
      accountsPayable,
      accruedExpenses,
      debt,
      totalLiabilities,
      shareholdersEquity,
      liabilitiesAndEquity,
      changeInWorkingCapital,
      operatingCashFlow,
      capitalExpenditures,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      funding,
      endingCash: cash,
      activeHires: activeHires.reduce((sum, hire) => sum + hire.count, 0),
      events,
    });
  }

  const runway = calculateRunway(months, simulationHorizon);
  const visibleMonths = months.slice(0, horizon);
  const final = visibleMonths[visibleMonths.length - 1];
  const breakEven = months.find((month) => month.operatingCashFlow >= 0);
  return {
    months: visibleMonths,
    ...runway,
    endingCash: final.endingCash,
    endingRevenue: final.revenue,
    endingBurn: Math.max(0, -final.operatingCashFlow),
    breakEvenMonth: breakEven?.month ?? null,
  };
}
