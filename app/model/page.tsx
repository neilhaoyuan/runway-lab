import { AppShell } from "@/components/app-shell";
import { ModelWorkspace } from "@/components/model-workspace";

export default function ModelPage() {
  return <AppShell title="Financial statements">
    <div className="mb-6"><p className="eyebrow">Financial statements</p><div className="mt-2"><h1 className="text-2xl font-medium tracking-[-.035em]">Actuals and forecast</h1><p className="mt-2 max-w-xl text-sm leading-5 text-zinc-500">Upload 12 months of financials or edit the sample sheet directly.</p></div></div>
    <ModelWorkspace />
  </AppShell>;
}
