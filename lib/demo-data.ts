import { compareScenarios } from "./forecasting/compare";
import type { HistoricalMonth, Scenario } from "./forecasting/types";

export const historicalMonths: HistoricalMonth[] = [
  { month: "2025-10", revenue: 35200, payroll: 65000, cloud: 7200, marketing: 10000, software: 5100, other: 6400, cash: 1790000 },
  { month: "2025-11", revenue: 38100, payroll: 65000, cloud: 7600, marketing: 10000, software: 5300, other: 6700, cash: 1733500 },
  { month: "2025-12", revenue: 41700, payroll: 65000, cloud: 8100, marketing: 11000, software: 5600, other: 7200, cash: 1678300 },
  { month: "2026-01", revenue: 45600, payroll: 75000, cloud: 8600, marketing: 12000, software: 6200, other: 7600, cash: 1614500 },
  { month: "2026-02", revenue: 48900, payroll: 75000, cloud: 9100, marketing: 12000, software: 6800, other: 8000, cash: 1552500 },
  { month: "2026-03", revenue: 51400, payroll: 82000, cloud: 9800, marketing: 14000, software: 7200, other: 8800, cash: 1482100 },
  { month: "2026-04", revenue: 54200, payroll: 89000, cloud: 10400, marketing: 15000, software: 7600, other: 9200, cash: 1434000 },
  { month: "2026-05", revenue: 58100, payroll: 89000, cloud: 10900, marketing: 15000, software: 7800, other: 9600, cash: 1365800 },
  { month: "2026-06", revenue: 61700, payroll: 96000, cloud: 11600, marketing: 16000, software: 8100, other: 10100, cash: 1285700 },
  { month: "2026-07", revenue: 66500, payroll: 96000, cloud: 12300, marketing: 16500, software: 8300, other: 9900, cash: 1209200 },
  { month: "2026-08", revenue: 72000, payroll: 112000, cloud: 14000, marketing: 18000, software: 9000, other: 12000, cash: 1116200 },
  { month: "2026-09", revenue: 77300, payroll: 112000, cloud: 14800, marketing: 18000, software: 9100, other: 11800, cash: 1027800 },
];

const common = {
  startingMonth: "2026-09",
  startingCash: 1_027_800,
  startingRevenue: 77_300,
  basePayroll: 112_000,
  softwareMonthly: 9_000,
  otherMonthly: 12_000,
  accountsReceivablePercentOfRevenue: 0.5,
  accountsPayablePercentOfSpend: 0.5,
  startingPrepaids: 20_000,
  startingFixedAssets: 150_000,
  startingDebt: 0,
  monthlyCapex: 6_000,
  monthlyDepreciation: 5_000,
};

export const scenarios: Scenario[] = [
  {
    id: "base",
    name: "Base Case",
    description: "Measured growth with a focused product team.",
    color: "#5f7bd8",
    assumptions: {
      ...common,
      monthlyRevenueGrowth: 0.07,
      cloudPercentOfRevenue: 0.12,
      marketingMonthly: 18_000,
      hires: [
        { id: "base-eng", role: "Software Engineer", count: 2, annualSalary: 170_000, startMonth: "2027-02" },
        { id: "base-ae", role: "Account Executive", count: 1, annualSalary: 130_000, startMonth: "2027-07" },
      ],
      fundingEvents: [],
    },
  },
  {
    id: "growth",
    name: "Aggressive Growth",
    description: "Front-load team and demand generation to capture the market.",
    color: "#3c8e9e",
    assumptions: {
      ...common,
      monthlyRevenueGrowth: 0.09,
      cloudPercentOfRevenue: 0.14,
      marketingMonthly: 34_000,
      hires: [
        { id: "growth-eng", role: "Software Engineer", count: 3, annualSalary: 180_000, startMonth: "2027-01" },
        { id: "growth-gtm", role: "GTM Lead", count: 1, annualSalary: 165_000, startMonth: "2027-03" },
      ],
      fundingEvents: [{ id: "growth-seed", amount: 1_500_000, month: "2027-08" }],
    },
  },
  {
    id: "efficient",
    name: "Capital Efficient",
    description: "Protect runway while compounding product-led growth.",
    color: "#8a72c7",
    assumptions: {
      ...common,
      monthlyRevenueGrowth: 0.052,
      cloudPercentOfRevenue: 0.095,
      marketingMonthly: 11_000,
      softwareMonthly: 7_500,
      otherMonthly: 9_000,
      hires: [{ id: "efficient-eng", role: "Software Engineer", count: 1, annualSalary: 155_000, startMonth: "2027-06" }],
      fundingEvents: [],
    },
  },
];

export const scenarioResults = compareScenarios(scenarios, 12);
