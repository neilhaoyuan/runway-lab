export type Hire = {
  id: string;
  role: string;
  count: number;
  annualSalary: number;
  startMonth: string;
};

export type FundingEvent = {
  id: string;
  amount: number;
  month: string;
};

export type Assumptions = {
  startingMonth: string;
  startingCash: number;
  startingRevenue: number;
  monthlyRevenueGrowth: number;
  basePayroll: number;
  cloudPercentOfRevenue: number;
  marketingMonthly: number;
  softwareMonthly: number;
  otherMonthly: number;
  accountsReceivablePercentOfRevenue?: number;
  accountsPayablePercentOfSpend?: number;
  startingPrepaids?: number;
  startingFixedAssets?: number;
  startingDebt?: number;
  monthlyCapex?: number;
  monthlyDepreciation?: number;
  hires: Hire[];
  fundingEvents: FundingEvent[];
};

export type HistoricalMonth = {
  month: string;
  revenue: number;
  payroll: number;
  cloud: number;
  marketing: number;
  software: number;
  other: number;
  cash: number;
  accountsReceivable?: number;
  prepaids?: number;
  fixedAssets?: number;
  accountsPayable?: number;
  accruedExpenses?: number;
  debt?: number;
  shareholdersEquity?: number;
};

export type ForecastMonth = {
  month: string;
  index: number;
  revenue: number;
  revenueGrowth: number;
  payroll: number;
  cloud: number;
  marketing: number;
  software: number;
  other: number;
  totalExpenses: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  depreciation: number;
  netIncome: number;
  accountsReceivable: number;
  prepaids: number;
  fixedAssets: number;
  totalAssets: number;
  accountsPayable: number;
  accruedExpenses: number;
  debt: number;
  totalLiabilities: number;
  shareholdersEquity: number;
  liabilitiesAndEquity: number;
  changeInWorkingCapital: number;
  operatingCashFlow: number;
  capitalExpenditures: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  funding: number;
  endingCash: number;
  activeHires: number;
  events: string[];
};

export type MonthlyForecastOverride = Partial<Pick<ForecastMonth,
  "revenueGrowth" | "payroll" | "cloud" | "marketing" | "software" | "other" |
  "accountsReceivable" | "accountsPayable" | "capitalExpenditures" | "funding"
>>;

export type ModelOverride = {
  month: string;
  revenueGrowth: number;
  payroll: number;
  cloud: number;
  marketing: number;
  software: number;
  other: number;
  accountsReceivable: number;
  accountsPayable: number;
  capitalExpenditures: number;
  funding: number;
};

export type ForecastResult = {
  months: ForecastMonth[];
  runwayMonths: number | null;
  runwayLabel: string;
  endingCash: number;
  endingRevenue: number;
  endingBurn: number;
  breakEvenMonth: string | null;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  color: string;
  assumptions: Assumptions;
};

export type ScenarioWithResult = Scenario & { result: ForecastResult };

export type ScenarioPlan = Scenario & { overrides: ModelOverride[] };

export type AttributionDriver = {
  name: string;
  impactMonths: number;
  detail: string;
};
