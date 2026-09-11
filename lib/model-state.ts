import { z } from "zod";
import { assumptionsSchema } from "./forecasting/schema";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const historicalMonthSchema = z.object({
  month: monthSchema,
  revenue: z.number(),
  payroll: z.number(),
  cloud: z.number(),
  marketing: z.number(),
  software: z.number(),
  other: z.number(),
  cash: z.number(),
  accountsReceivable: z.number().optional(),
  prepaids: z.number().optional(),
  fixedAssets: z.number().optional(),
  accountsPayable: z.number().optional(),
  accruedExpenses: z.number().optional(),
  debt: z.number().optional(),
  shareholdersEquity: z.number().optional(),
}).strict();

const overrideSchema = z.object({
  month: monthSchema,
  revenueGrowth: z.number(),
  payroll: z.number(),
  cloud: z.number(),
  marketing: z.number(),
  software: z.number(),
  other: z.number(),
  accountsReceivable: z.number(),
  accountsPayable: z.number(),
  capitalExpenditures: z.number(),
  funding: z.number(),
}).strict();

const scenarioPlanSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  color: z.string().min(1).max(40),
  assumptions: assumptionsSchema,
  overrides: z.array(overrideSchema).max(60),
}).strict();

export const modelStateSchema = z.object({
  version: z.literal(1),
  history: z.array(historicalMonthSchema).min(1).max(120),
  scenarios: z.array(scenarioPlanSchema).min(1).max(50),
  activeScenarioId: z.string().min(1).max(160),
}).strict().superRefine((state, context) => {
  if (!state.scenarios.some((scenario) => scenario.id === state.activeScenarioId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["activeScenarioId"], message: "Active scenario must exist in scenarios" });
  }
});

export type ModelState = z.infer<typeof modelStateSchema>;
