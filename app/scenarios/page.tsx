import { AppShell } from "@/components/app-shell";
import { ScenarioBuilder } from "@/components/scenario-builder";

export default function ScenariosPage() {
  return <AppShell title="Scenarios"><div className="mb-6"><p className="eyebrow">Scenarios</p><h1 className="mt-2 text-2xl font-medium tracking-[-.035em]">Plan the next twelve months</h1><p className="mt-2 text-sm text-zinc-500">Create and compare revenue, spending, hiring, and funding plans.</p></div><ScenarioBuilder /></AppShell>;
}
