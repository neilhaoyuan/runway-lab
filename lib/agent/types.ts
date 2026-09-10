import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const agentScenarioPatchSchema = z.object({
  monthlyRevenueGrowth: z.number().min(-.99).max(1).optional(),
  basePayroll: z.number().nonnegative().optional(),
  cloudPercentOfRevenue: z.number().min(0).max(1).optional(),
  marketingMonthly: z.number().nonnegative().optional(),
  softwareMonthly: z.number().nonnegative().optional(),
  otherMonthly: z.number().nonnegative().optional(),
  hires: z.array(z.object({ role: z.string().min(1), count: z.number().int().positive(), annualSalary: z.number().nonnegative(), startMonth: monthSchema })).optional(),
  fundingEvents: z.array(z.object({ amount: z.number().nonnegative(), month: monthSchema })).optional(),
}).strict();

export const agentActionSchema = z.object({
  type: z.enum(["create_scenario", "update_scenario", "update_scenario_details", "select_scenario", "delete_scenario", "adjust_actual", "resolve_reconciliation_issue"]),
  label: z.string().min(1),
  scenarioId: z.string().optional(),
  sourceScenarioId: z.string().optional(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  patch: agentScenarioPatchSchema.optional(),
  month: monthSchema.optional(),
  field: z.enum(["revenue", "payroll", "cloud", "marketing", "software", "other", "endingCash", "accountsReceivable", "prepaids", "fixedAssets", "accountsPayable", "accruedExpenses", "debt", "shareholdersEquity"]).optional(),
  value: z.number().optional(),
  issueId: z.string().optional(),
  reason: z.string().max(500).optional(),
}).strict().superRefine((action, context) => {
  const requireField = (present: boolean, field: string) => {
    if (!present) context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required for ${action.type}` });
  };
  if (action.type === "create_scenario") requireField(Boolean(action.name), "name");
  if (action.type === "update_scenario") {
    requireField(Boolean(action.scenarioId), "scenarioId");
    requireField(Boolean(action.patch), "patch");
  }
  if (["update_scenario_details", "select_scenario", "delete_scenario"].includes(action.type)) requireField(Boolean(action.scenarioId), "scenarioId");
  if (action.type === "adjust_actual") {
    requireField(Boolean(action.month), "month");
    requireField(Boolean(action.field), "field");
    requireField(action.value !== undefined, "value");
  }
  if (action.type === "resolve_reconciliation_issue") requireField(Boolean(action.issueId), "issueId");
});

export const agentPlanSchema = z.object({
  reply: z.string(),
  questions: z.array(z.string()).default([]),
  actions: z.array(agentActionSchema).max(25).default([]),
}).strict();

export const agentRequestSchema = z.object({
  message: z.string().min(2).max(2000),
  context: z.object({
    activeScenarioId: z.string(),
    scenarios: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      assumptions: z.object({
        monthlyRevenueGrowth: z.number(),
        basePayroll: z.number(),
        cloudPercentOfRevenue: z.number(),
        marketingMonthly: z.number(),
        softwareMonthly: z.number(),
        otherMonthly: z.number(),
        hires: z.array(z.object({ id: z.string(), role: z.string(), count: z.number(), annualSalary: z.number(), startMonth: monthSchema })),
        fundingEvents: z.array(z.object({ id: z.string(), amount: z.number(), month: monthSchema })),
      }).strict(),
    }).strict()),
    history: z.array(z.object({
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
    }).strict()).max(24),
    reconciliationIssues: z.array(z.object({ id: z.string(), severity: z.enum(["error", "warning"]), statement: z.string().optional(), month: z.string().optional(), message: z.string() })).max(100),
  }),
});

export type AgentScenarioPatch = z.infer<typeof agentScenarioPatchSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type AgentPlan = z.infer<typeof agentPlanSchema>;
export type AgentRequest = z.infer<typeof agentRequestSchema>;

export const agentPlanJsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Concise explanation of the proposed plan or why clarification is required." },
    questions: { type: "array", items: { type: "string" }, description: "Questions that must be answered before safe actions can be proposed." },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["create_scenario", "update_scenario", "update_scenario_details", "select_scenario", "delete_scenario", "adjust_actual", "resolve_reconciliation_issue"] },
          label: { type: "string" }, scenarioId: { type: "string" }, sourceScenarioId: { type: "string" }, name: { type: "string" }, description: { type: "string" },
          patch: {
            type: "object",
            properties: {
              monthlyRevenueGrowth: { type: "number" }, basePayroll: { type: "number" }, cloudPercentOfRevenue: { type: "number" }, marketingMonthly: { type: "number" }, softwareMonthly: { type: "number" }, otherMonthly: { type: "number" },
              hires: { type: "array", items: { type: "object", properties: { role: { type: "string" }, count: { type: "integer" }, annualSalary: { type: "number" }, startMonth: { type: "string" } }, required: ["role", "count", "annualSalary", "startMonth"] } },
              fundingEvents: { type: "array", items: { type: "object", properties: { amount: { type: "number" }, month: { type: "string" } }, required: ["amount", "month"] } },
            },
          },
          month: { type: "string" }, field: { type: "string", enum: ["revenue", "payroll", "cloud", "marketing", "software", "other", "endingCash", "accountsReceivable", "prepaids", "fixedAssets", "accountsPayable", "accruedExpenses", "debt", "shareholdersEquity"] }, value: { type: "number" }, issueId: { type: "string" }, reason: { type: "string" },
        },
        required: ["type", "label"],
      },
    },
  },
  required: ["reply", "questions", "actions"],
} as const;
