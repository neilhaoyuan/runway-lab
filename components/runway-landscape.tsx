"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { HistoricalMonth, ScenarioWithResult } from "@/lib/forecasting/types";
import { money, monthLabel } from "@/lib/format";

function cashY(cash: number, maxCash: number) {
  return cash / maxCash * 3.2;
}

function Trajectory({ scenario, z, active, onSelect, maxCash, startingCash, light }: { scenario: ScenarioWithResult; z: number; active: boolean; onSelect: () => void; maxCash: number; startingCash: number; light: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const color = scenario.id === "base" ? (light ? "#4b6fff" : "#718bff") : scenario.color;
  const forecastPoints = useMemo(() => scenario.result.months.map((month, index) => new THREE.Vector3((index + 1) * .48, cashY(month.endingCash, maxCash), z)), [scenario, maxCash, z]);
  const points = useMemo(() => [new THREE.Vector3(0, cashY(startingCash, maxCash), 0), ...forecastPoints], [forecastPoints, maxCash, startingCash]);

  return <group>
    {active && <Line points={points.map((point) => [point.x, .02, point.z] as [number, number, number])} color={color} lineWidth={1} opacity={.18} transparent />}
    <Line points={points} color={color} lineWidth={active ? 3.4 : 1.8} opacity={active ? 1 : .48} transparent onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "default"; setHovered(null); }} />
    {forecastPoints.map((point, index) => {
      const month = scenario.result.months[index];
      const isEvent = month.events.length > 0;
      if (!isEvent && index % 3 !== 0 && index !== forecastPoints.length - 1) return null;
      return <mesh key={month.month} position={point} scale={isEvent ? .095 : .052} onPointerOver={(event) => { event.stopPropagation(); setHovered(index); }} onPointerOut={() => setHovered(null)}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={isEvent ? (light ? "#172033" : "#ffffff") : color} />
        {hovered === index && <Html center distanceFactor={8}>
          <div className={`pointer-events-none w-44 rounded border p-3 text-xs shadow-xl ${light ? "border-[#c6cdd8] bg-[#f7f8fa]/95 text-[#596579]" : "border-zinc-700 bg-[#0c0f12]/95 text-[#a1a1aa]"}`}>
            <div className="mb-2 flex items-center justify-between"><span className={light ? "font-semibold text-[#172033]" : "font-semibold text-[#f4f4f5]"}>{monthLabel(month.month, true)}</span><span style={{ color }}>{scenario.name}</span></div>
            <div className="grid grid-cols-2 gap-y-1"><span>Cash</span><span className={`text-right font-mono ${light ? "text-[#172033]" : "text-[#f4f4f5]"}`}>{money(month.endingCash)}</span><span>Revenue</span><span className={`text-right font-mono ${light ? "text-[#172033]" : "text-[#f4f4f5]"}`}>{money(month.revenue)}</span><span>Cash flow</span><span className={`text-right font-mono ${light ? "text-[#172033]" : "text-[#f4f4f5]"}`}>{money(month.netCashFlow)}</span></div>
            {month.events.length > 0 && <p className={`mt-2 border-t pt-2 ${light ? "border-[#c6cdd8]" : "border-zinc-800"}`} style={{ color }}>{month.events.join(" · ")}</p>}
          </div>
        </Html>}
      </mesh>;
    })}
  </group>;
}

function ActualTrajectory({ history, maxCash, light }: { history: HistoricalMonth[]; maxCash: number; light: boolean }) {
  const points = history.map((month, index) => new THREE.Vector3((index - history.length + 1) * .48, cashY(month.cash, maxCash), 0));
  return <group><Line points={points} color={light ? "#687386" : "#8b949e"} lineWidth={2.2} opacity={.8} transparent /><mesh position={points[points.length - 1]} scale={.075}><sphereGeometry args={[1, 14, 14]} /><meshBasicMaterial color={light ? "#384152" : "#f4f4f5"} /></mesh></group>;
}

export function RunwayLandscape({ scenarios, history = [], compact = false, selectedScenarioId, onScenarioSelect }: { scenarios: ScenarioWithResult[]; history?: HistoricalMonth[]; compact?: boolean; selectedScenarioId?: string; onScenarioSelect?: (id: string) => void }) {
  const [visible, setVisible] = useState(() => Object.fromEntries(scenarios.map((scenario) => [scenario.id, true])));
  const [light, setLight] = useState(false);
  const activeScenarioId = scenarios.some((scenario) => scenario.id === selectedScenarioId) ? selectedScenarioId : scenarios[0].id;
  const startingCash = history.at(-1)?.cash ?? scenarios[0].assumptions.startingCash;
  const maxCash = Math.max(1, ...history.map((month) => Math.abs(month.cash)), ...scenarios.flatMap((scenario) => scenario.result.months.map((month) => Math.abs(month.endingCash))));

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setLight(root.dataset.theme === "light");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return <div className={`relative h-full min-h-[260px] overflow-hidden rounded border border-line transition-colors ${light ? "bg-[#eef1f5]" : "bg-[#090c0e]"}`}>
    <Canvas camera={{ position: [1.4, 4.2, 8.5], fov: 42 }} dpr={[1, 1.5]}>
      <ambientLight intensity={.8} />
      <gridHelper key={light ? "light-grid" : "dark-grid"} args={[13, 26, light ? "#aeb8c7" : "#283039", light ? "#d8dde5" : "#151a1f"]} position={[0, 0, 0]} />
      {history.length > 0 && <ActualTrajectory history={history} maxCash={maxCash} light={light} />}
      {scenarios.map((scenario, index) => visible[scenario.id] && <Trajectory key={scenario.id} scenario={scenario} z={(index - (scenarios.length - 1) / 2) * 1.3} maxCash={maxCash} startingCash={startingCash} light={light} active={activeScenarioId === scenario.id} onSelect={() => onScenarioSelect?.(scenario.id)} />)}
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={.08} minDistance={5.5} maxDistance={13} minPolarAngle={.2} maxPolarAngle={1.5} />
    </Canvas>
    <div className="pointer-events-none absolute left-3 top-3"><span className={`pill ${light ? "border-[#c6cdd8] bg-[#f7f8fa]/80 text-[#596579]" : "border-zinc-700 bg-black/40 text-[#a1a1aa]"}`}>Actuals → forecast / drag to rotate</span></div>
    {!compact && <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
      <span className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs ${light ? "border-[#c6cdd8] bg-[#f7f8fa]/90 text-[#384152]" : "border-zinc-700 bg-black/60 text-[#e4e4e7]"}`}><span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />Actual</span>
      {scenarios.map((scenario) => <button key={scenario.id} onClick={() => setVisible((current) => ({ ...current, [scenario.id]: !current[scenario.id] }))} className={`pointer-events-auto flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs transition ${light ? (visible[scenario.id] ? "border-[#c6cdd8] bg-[#f7f8fa]/90 text-[#384152]" : "border-[#d8dde5] bg-[#eef1f5]/70 text-[#8993a5]") : (visible[scenario.id] ? "border-zinc-700 bg-black/60 text-[#e4e4e7]" : "border-zinc-800 bg-black/30 text-[#71717a]")}`}><span className="h-1.5 w-1.5 rounded-full" style={{ background: scenario.id === "base" ? (light ? "#4b6fff" : "#718bff") : scenario.color }} />{scenario.name}</button>)}
    </div>}
    <div className={`pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-wider ${light ? "text-[#657188]" : "text-[#71717a]"}`}>Time / cash / scenario</div>
  </div>;
}
