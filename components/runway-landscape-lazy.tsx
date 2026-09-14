"use client";

import dynamic from "next/dynamic";
import type { HistoricalMonth, ScenarioWithResult } from "@/lib/forecasting/types";

const Landscape = dynamic(
  () => import("./runway-landscape").then((module) => module.RunwayLandscape),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[260px] animate-pulse rounded-md border border-line bg-panel" />,
  },
);

export function RunwayLandscapeLazy(props: { scenarios: ScenarioWithResult[]; history?: HistoricalMonth[]; compact?: boolean; selectedScenarioId?: string; onScenarioSelect?: (id: string) => void }) {
  return <Landscape {...props} />;
}
