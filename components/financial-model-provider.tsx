"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { historicalMonths, scenarios as defaultScenarios } from "@/lib/demo-data";
import { forecast } from "@/lib/forecasting/engine";
import type { Assumptions, HistoricalMonth, ModelOverride, ScenarioPlan } from "@/lib/forecasting/types";
import type { AgentAction, AgentScenarioPatch } from "@/lib/agent/types";
import type { FinancialWorkbookResult } from "@/lib/financial-workbook";
import { applyScenarioPatch } from "@/lib/forecasting/apply-scenario-patch";
import { updateHistoricalActual, type HistoricalEditableKey } from "@/lib/forecasting/history-edit";
import type { ModelState } from "@/lib/model-state";

type PendingImport = { report: FinancialWorkbookResult; history: HistoricalMonth[] };
export type CloudStatus = "checking" | "local" | "loading" | "saving" | "saved" | "error";

type ModelContextValue = {
  history: HistoricalMonth[];
  setHistory: React.Dispatch<React.SetStateAction<HistoricalMonth[]>>;
  scenarios: ScenarioPlan[];
  activeScenarioId: string;
  activeScenario: ScenarioPlan;
  setActiveScenarioId: (id: string) => void;
  addScenario: () => string;
  updateScenarioDetails: (id: string, details: Partial<Pick<ScenarioPlan, "name" | "description">>) => void;
  assumptions: Assumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<Assumptions>>;
  overrides: ModelOverride[];
  setOverrides: React.Dispatch<React.SetStateAction<ModelOverride[]>>;
  pendingImport: PendingImport | null;
  setPendingImport: React.Dispatch<React.SetStateAction<PendingImport | null>>;
  resolvedImportIssues: Set<string>;
  setResolvedImportIssues: React.Dispatch<React.SetStateAction<Set<string>>>;
  applyAgentActions: (actions: AgentAction[]) => void;
  cloudStatus: CloudStatus;
  cloudMessage: string | null;
  resetModel: () => void;
};

const ModelContext = createContext<ModelContextValue | null>(null);
export const MODEL_STORAGE_KEY = "runway-lab-model-v3";
const colors = ["#5f7bd8", "#3c8e9e", "#8a72c7", "#c17c45", "#b96672", "#587ea8"];

export function overridesFor(assumptions: Assumptions): ModelOverride[] {
  return forecast(assumptions, 12).months.map((month) => ({
    month: month.month,
    revenueGrowth: month.revenueGrowth,
    payroll: month.payroll,
    cloud: month.cloud,
    marketing: month.marketing,
    software: month.software,
    other: month.other,
    accountsReceivable: month.accountsReceivable,
    accountsPayable: month.accountsPayable,
    capitalExpenditures: month.capitalExpenditures,
    funding: month.funding,
  }));
}

function scenarioPatch(patch: AgentScenarioPatch | undefined, suffix: string) {
  if (!patch) return {};
  return {
    ...patch,
    hires: patch.hires?.map((hire, index) => ({ ...hire, id: `agent-hire-${suffix}-${index}` })),
    fundingEvents: patch.fundingEvents?.map((event, index) => ({ ...event, id: `agent-funding-${suffix}-${index}` })),
  };
}

function initialScenarios(): ScenarioPlan[] {
  return defaultScenarios.map((scenario) => ({ ...scenario, overrides: overridesFor(scenario.assumptions) }));
}

function modelState(history: HistoricalMonth[], scenarios: ScenarioPlan[], activeScenarioId: string): ModelState {
  return { version: 1, history, scenarios, activeScenarioId };
}

export function FinancialModelProvider({ children }: { children: React.ReactNode }) {
  const defaults = useMemo(initialScenarios, []);
  const [history, setHistory] = useState<HistoricalMonth[]>(historicalMonths);
  const [scenarioPlans, setScenarioPlans] = useState<ScenarioPlan[]>(defaults);
  const [activeScenarioId, setActiveScenarioIdState] = useState(defaults[0].id);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [resolvedImportIssues, setResolvedImportIssues] = useState<Set<string>>(() => new Set());
  const [localHydrated, setLocalHydrated] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("checking");
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const cloudStarted = useRef(false);
  const cloudReady = useRef(false);
  const skipNextCloudSave = useRef(false);
  const activeScenario = scenarioPlans.find((scenario) => scenario.id === activeScenarioId) ?? scenarioPlans[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { history?: HistoricalMonth[]; scenarios?: ScenarioPlan[]; activeScenarioId?: string };
        if (parsed.history?.length) setHistory(parsed.history);
        if (parsed.scenarios?.length) setScenarioPlans(parsed.scenarios.map((scenario, index) => ({
          ...scenario,
          color: colors[index % colors.length],
        })));
        if (parsed.activeScenarioId) setActiveScenarioIdState(parsed.activeScenarioId);
      }
    } finally { setLocalHydrated(true); }
  }, []);

  useEffect(() => {
    if (localHydrated) localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify({ history, scenarios: scenarioPlans, activeScenarioId }));
  }, [history, scenarioPlans, activeScenarioId, localHydrated]);

  useEffect(() => {
    if (!localHydrated || cloudStarted.current) return;
    cloudStarted.current = true;
    setCloudStatus("loading");
    void (async () => {
      try {
        const response = await fetch("/api/model-state", { cache: "no-store" });
        if (response.status === 401 || response.status === 503) {
          setCloudStatus("local");
          setCloudMessage(response.status === 503 ? "Connect Supabase to enable cloud save." : "Sign in to enable cloud save.");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load cloud data.");
        if (data.state) {
          const saved = data.state as ModelState;
          skipNextCloudSave.current = true;
          setHistory(saved.history);
          setScenarioPlans(saved.scenarios.map((scenario, index) => ({ ...scenario, color: scenario.color || colors[index % colors.length] })));
          setActiveScenarioIdState(saved.activeScenarioId);
        } else {
          const saveResponse = await fetch("/api/model-state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(modelState(history, scenarioPlans, activeScenarioId)) });
          if (!saveResponse.ok) throw new Error((await saveResponse.json()).error ?? "Could not create cloud save.");
        }
        cloudReady.current = true;
        setCloudStatus("saved");
        setCloudMessage(data.state ? "Loaded from cloud." : "This browser model is now saved to your account.");
      } catch (error) {
        setCloudStatus("error");
        setCloudMessage(error instanceof Error ? error.message : "Cloud save is unavailable.");
      }
    })();
  }, [localHydrated, history, scenarioPlans, activeScenarioId]);

  useEffect(() => {
    if (!localHydrated || !cloudReady.current) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }
    setCloudStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/model-state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(modelState(history, scenarioPlans, activeScenarioId)) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not save model.");
        setCloudStatus("saved");
        setCloudMessage("Saved to cloud.");
      } catch (error) {
        setCloudStatus("error");
        setCloudMessage(error instanceof Error ? error.message : "Cloud save failed; local copy retained.");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [history, scenarioPlans, activeScenarioId, localHydrated]);

  function updateActive(update: (scenario: ScenarioPlan) => ScenarioPlan) {
    setScenarioPlans((current) => current.map((scenario) => scenario.id === activeScenarioId ? update(scenario) : scenario));
  }

  const value = useMemo<ModelContextValue>(() => ({
    history,
    setHistory,
    scenarios: scenarioPlans,
    activeScenarioId,
    activeScenario,
    setActiveScenarioId: (id) => { if (scenarioPlans.some((scenario) => scenario.id === id)) setActiveScenarioIdState(id); },
    addScenario: () => {
      const source = activeScenario;
      const id = `scenario-${Date.now()}`;
      const next: ScenarioPlan = {
        ...source,
        id,
        name: "New Scenario",
        description: "",
        color: colors[scenarioPlans.length % colors.length],
        assumptions: { ...source.assumptions, hires: source.assumptions.hires.map((hire) => ({ ...hire, id: `${hire.id}-${id}` })), fundingEvents: source.assumptions.fundingEvents.map((event) => ({ ...event, id: `${event.id}-${id}` })) },
        overrides: source.overrides.map((override) => ({ ...override })),
      };
      setScenarioPlans((current) => [...current, next]);
      setActiveScenarioIdState(id);
      return id;
    },
    updateScenarioDetails: (id, details) => setScenarioPlans((current) => current.map((scenario) => scenario.id === id ? { ...scenario, ...details } : scenario)),
    assumptions: activeScenario.assumptions,
    setAssumptions: (value) => updateActive((scenario) => ({ ...scenario, assumptions: typeof value === "function" ? value(scenario.assumptions) : value })),
    overrides: activeScenario.overrides,
    setOverrides: (value) => updateActive((scenario) => ({ ...scenario, overrides: typeof value === "function" ? value(scenario.overrides) : value })),
    pendingImport,
    setPendingImport,
    resolvedImportIssues,
    setResolvedImportIssues,
    applyAgentActions: (actions) => {
      const suffix = String(Date.now());
      let nextPlans = scenarioPlans.map((scenario) => ({ ...scenario, assumptions: { ...scenario.assumptions, hires: scenario.assumptions.hires.map((hire) => ({ ...hire })), fundingEvents: scenario.assumptions.fundingEvents.map((event) => ({ ...event })) }, overrides: scenario.overrides.map((override) => ({ ...override })) }));
      let nextActiveId = activeScenarioId;
      let nextHistory = pendingImport?.history.map((month) => ({ ...month })) ?? history.map((month) => ({ ...month }));
      let nextResolved = new Set(resolvedImportIssues);
      actions.forEach((action, actionIndex) => {
        if (action.type === "create_scenario" && action.name) {
          const source = nextPlans.find((scenario) => scenario.id === action.sourceScenarioId) ?? nextPlans.find((scenario) => scenario.id === nextActiveId) ?? nextPlans[0];
          if (!source) return;
          const id = `scenario-${suffix}-${actionIndex}`;
          const patched = applyScenarioPatch(source.assumptions, source.overrides, history, scenarioPatch(action.patch, `${suffix}-${actionIndex}`));
          nextPlans.push({ ...source, id, name: action.name, description: action.description ?? "", color: colors[nextPlans.length % colors.length], assumptions: patched.assumptions, overrides: patched.overrides });
          nextActiveId = id;
        }
        if (action.type === "update_scenario" && action.scenarioId && action.patch) nextPlans = nextPlans.map((scenario) => {
          if (scenario.id !== action.scenarioId) return scenario;
          const patched = applyScenarioPatch(scenario.assumptions, scenario.overrides, history, scenarioPatch(action.patch, `${suffix}-${actionIndex}`));
          return { ...scenario, assumptions: patched.assumptions, overrides: patched.overrides };
        });
        if (action.type === "update_scenario_details" && action.scenarioId) nextPlans = nextPlans.map((scenario) => scenario.id === action.scenarioId ? { ...scenario, name: action.name ?? scenario.name, description: action.description ?? scenario.description } : scenario);
        if (action.type === "select_scenario" && action.scenarioId && nextPlans.some((scenario) => scenario.id === action.scenarioId)) nextActiveId = action.scenarioId;
        if (action.type === "delete_scenario" && action.scenarioId && nextPlans.length > 1) {
          nextPlans = nextPlans.filter((scenario) => scenario.id !== action.scenarioId);
          if (nextActiveId === action.scenarioId) nextActiveId = nextPlans[0].id;
        }
        if (action.type === "adjust_actual" && action.month && action.field && action.value !== undefined) {
          const monthIndex = nextHistory.findIndex((month) => month.month === action.month);
          if (monthIndex >= 0) nextHistory = updateHistoricalActual(nextHistory, monthIndex, action.field as HistoricalEditableKey, action.value);
        }
        if (action.type === "resolve_reconciliation_issue" && action.issueId) nextResolved.add(action.issueId);
      });
      setScenarioPlans(nextPlans);
      setActiveScenarioIdState(nextActiveId);
      if (pendingImport) setPendingImport({ ...pendingImport, history: nextHistory });
      else setHistory(nextHistory);
      setResolvedImportIssues(nextResolved);
    },
    cloudStatus,
    cloudMessage,
    resetModel: () => {
      localStorage.removeItem(MODEL_STORAGE_KEY);
      setHistory(historicalMonths);
      const next = initialScenarios();
      setScenarioPlans(next);
      setActiveScenarioIdState(next[0].id);
      setPendingImport(null);
      setResolvedImportIssues(new Set());
    },
  }), [history, scenarioPlans, activeScenarioId, activeScenario, pendingImport, resolvedImportIssues, cloudStatus, cloudMessage]);

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useFinancialModel() {
  const context = useContext(ModelContext);
  if (!context) throw new Error("useFinancialModel must be used inside FinancialModelProvider");
  return context;
}
