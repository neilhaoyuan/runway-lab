"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Braces, Command, FlaskConical, GitCompareArrows } from "lucide-react";
import { Logo } from "./logo";
import { CommandPalette } from "./command-palette";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { AccountControl } from "./account-control";

const nav = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/model", label: "Financial model", icon: Braces },
  { href: "/scenarios", label: "Scenarios", icon: FlaskConical },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
];

export function AppShell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const openPalette = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", openPalette);
    return () => window.removeEventListener("keydown", openPalette);
  }, []);
  useEffect(() => {
    const openAgent = () => setPaletteOpen(true);
    window.addEventListener("runway:open-agent", openAgent);
    return () => window.removeEventListener("runway:open-agent", openAgent);
  }, []);
  return (
    <div className="min-h-screen bg-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] border-r border-line bg-panel lg:block">
        <div className="flex h-16 items-center border-b border-line px-5"><Logo /></div>
        <div className="px-3 py-5">
          <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[.16em] text-zinc-700">Workspace</p>
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return <Link key={item.href} href={item.href} className={`flex h-9 items-center gap-3 rounded px-2.5 text-xs transition ${active ? "bg-acid/10 text-zinc-100" : "text-zinc-500 hover:bg-ink hover:text-zinc-300"}`}><item.icon size={15} className={active ? "text-acid" : ""} />{item.label}</Link>;
            })}
          </nav>
        </div>
      </aside>
      <main className="lg:pl-[228px]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-line bg-ink/85 px-5 backdrop-blur-xl md:px-7">
          <div className="lg:hidden"><Logo compact /></div>
          <div className="hidden lg:block"><p className="text-base font-semibold tracking-[-.015em]">{title}</p></div>
          <div className="flex items-center gap-2">
            <AccountControl />
            <ThemeToggle />
            <button aria-label="Open financial agent" onClick={() => setPaletteOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-acid/40 bg-acid/10 px-4 text-sm font-medium text-acid transition hover:border-acid/70 hover:bg-acid/15"><Command size={16} /> Financial agent <span className="ml-2 hidden rounded border border-acid/25 px-1.5 py-0.5 font-mono text-[10px] text-acid/70 sm:inline">Ctrl K</span></button>
            {action}
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 md:p-7">{children}</div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
