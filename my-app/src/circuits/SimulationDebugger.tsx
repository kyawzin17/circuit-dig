import React from "react";
import type { SimulationDiagnostics } from "./simulator/types/simulator.types";

type Props = {
  diagnostics: SimulationDiagnostics;
  running: boolean;
  onRun: () => void;
  onPause: () => void;
  onStep: () => void;
  onStop: () => void;
  onReset: () => void;
};

const fmt = (value: number | undefined, digits = 2) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";

const SimulationDebugger: React.FC<Props> = ({
  diagnostics,
  running,
  onRun,
  onPause,
  onStep,
  onStop,
  onReset,
}) => {
  return (
    <div className="absolute bottom-20 right-4 z-50 w-[360px] max-h-[70vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Simulation Debugger</div>
          <div className="text-[10px] text-slate-400">
            {fmt(diagnostics.simulatedMs, 1)} ms · {diagnostics.frameCount} frames
          </div>
        </div>
        <div className={running ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-slate-600"} />
      </div>

      <div className="flex gap-1 border-b border-slate-800 p-2">
        {!running ? (
          <button onClick={onRun} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs">Run</button>
        ) : (
          <button onClick={onPause} className="rounded-lg bg-amber-600 px-2 py-1 text-xs">Pause</button>
        )}
        <button onClick={onStep} disabled={running} className="rounded-lg bg-slate-800 px-2 py-1 text-xs disabled:opacity-40">Step</button>
        <button onClick={onStop} className="rounded-lg bg-slate-800 px-2 py-1 text-xs">Stop</button>
        <button onClick={onReset} className="rounded-lg bg-slate-800 px-2 py-1 text-xs">Reset</button>
      </div>

      <div className="max-h-[calc(70vh-108px)] overflow-y-auto p-3 space-y-3">
        {diagnostics.faults.length > 0 && (
          <section>
            <div className="mb-1 text-xs font-semibold text-red-400">Faults</div>
            <div className="space-y-1">
              {diagnostics.faults.map((fault) => (
                <div key={fault} className="rounded-lg border border-red-900/60 bg-red-950/40 px-2 py-1 text-[10px] text-red-300">
                  {fault}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-1 text-xs font-semibold text-slate-300">Pins</div>
          <div className="grid grid-cols-2 gap-1">
            {diagnostics.pins.slice(0, 24).map((pin) => (
              <div key={pin.pin} className="rounded-lg bg-slate-900 px-2 py-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300">{pin.pin}</span>
                  <span className="text-slate-500">{pin.mode ?? ""}</span>
                </div>
                <div className="text-xs">
                  {pin.voltage !== undefined ? `${fmt(pin.voltage)} V` : pin.digitalLevel !== undefined ? `D${pin.digitalLevel}` : "floating"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-1 text-xs font-semibold text-slate-300">Nets</div>
          <div className="space-y-1">
            {diagnostics.nets.map((net) => (
              <div key={net.netId} className="rounded-lg bg-slate-900 px-2 py-1.5">
                <div className="flex justify-between text-[10px]">
                  <span>{net.netId}</span>
                  <span className={net.active ? "text-emerald-400" : "text-slate-500"}>{net.active ? "ACTIVE" : "idle"}</span>
                </div>
                <div className="text-xs">{fmt(net.voltage)} V · {fmt(net.currentMa)} mA</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-1 text-xs font-semibold text-slate-300">Components</div>
          <div className="space-y-1">
            {diagnostics.components.map((component) => (
              <div key={component.id} className="rounded-lg bg-slate-900 px-2 py-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="truncate pr-2">{component.type}</span>
                  <span className={component.active ? "text-emerald-400" : "text-slate-500"}>{component.active ? "ON" : "OFF"}</span>
                </div>
                <div className="text-xs">{fmt(component.currentMa)} mA{component.powerMw !== undefined ? ` · ${fmt(component.powerMw)} mW` : ""}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SimulationDebugger;
