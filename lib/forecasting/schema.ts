import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

export const hireSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1).max(80),
  count: z.number().int().nonnegative().max(100),
  annualSalary: z.number().nonnegative().max(2_000_000),
  startMonth: monthSchema,
});

export const fundingEventSchema = z.object({
  id: z.string().min(1),
  amount: z.number().nonnegative().max(1_000_000_000),
  month: monthSchema,
});

export const assumptionsSchema = z.object({
  startingMonth: monthSchema,
  startingCash: z.number().min(-10_000_000_000).max(10_000_000_000),
  startingRevenue: z.number().nonnegative().max(1_000_000_000),
  monthlyRevenueGrowth: z.number().min(-0.99).max(1),
  basePayroll: z.number().nonnegative().max(1_000_000_000),
  cloudPercentOfRevenue: z.number().min(0).max(1),
  marketingMonthly: z.number().nonnegative().max(1_000_000_000),
  softwareMonthly: z.number().nonnegative().max(1_000_000_000),
  otherMonthly: z.number().nonnegative().max(1_000_000_000),
  accountsReceivablePercentOfRevenue: z.number().min(0).max(3).optional(),
  accountsPayablePercentOfSpend: z.number().min(0).max(3).optional(),
  startingPrepaids: z.number().nonnegative().optional(),
  startingFixedAssets: z.number().nonnegative().optional(),
  startingDebt: z.number().nonnegative().optional(),
  monthlyCapex: z.number().nonnegative().optional(),
  monthlyDepreciation: z.number().nonnegative().optional(),
  hires: z.array(hireSchema).max(100),
  fundingEvents: z.array(fundingEventSchema).max(50),
});

export const scenarioPatchSchema = z.object({
  monthlyRevenueGrowth: z.number().min(-0.99).max(1).optional(),
  basePayroll: z.number().nonnegative().optional(),
  cloudPercentOfRevenue: z.number().min(0).max(1).optional(),
  marketingMonthly: z.number().nonnegative().optional(),
  softwareMonthly: z.number().nonnegative().optional(),
  otherMonthly: z.number().nonnegative().optional(),
  hires: z.array(hireSchema).optional(),
  fundingEvents: z.array(fundingEventSchema).optional(),
});

export type ScenarioPatch = z.infer<typeof scenarioPatchSchema>;
