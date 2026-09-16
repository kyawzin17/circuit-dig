import type { Node, Edge } from "reactflow";
import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";
import type { SimulationEngineOptions, SimulationStatus } from "../types/simulator.types";
import { createCircuitGraph, type CircuitEdgeData } from "../circuit/CircuitGraph";
import { NetlistBuilder, type Netlist } from "../circuit/NetlistBuilder";
import { DigitalNetSolver, type DigitalSolveResult } from "../electrical/DigitalNetSolver";
import { intelHexToProgram } from "./IntelHex";

export class SimulationEngine {
  private status: SimulationStatus = "idle";
  private readonly arduino = new ArduinoUnoRuntime();
  private readonly avr = new Avr8jsRunner();
  private readonly clock = new SimulationClock();
  private readonly netlistBuilder = new NetlistBuilder();
  private readonly digitalSolver = new DigitalNetSolver();
  private readonly options: SimulationEngineOptions;
  private netlist: Netlist | null = null;
  private circuitNodes: Node[] = [];
  private circuitEdges: Edge<CircuitEdgeData>[] = [];
  private digitalStates: DigitalSolveResult = new Map();
  private firmwareLoaded = false;
  private readonly cyclesPerFrame: number;

  constructor(options: SimulationEngineOptions = {}) {
    this.options = options;
    const frequency = options.config?.frequency ?? 16_000_000;
    this.cyclesPerFrame = Math.max(1, Math.floor(frequency / 60));
  }

  getStatus(): SimulationStatus { return this.status; }

  private emit(): void {
    this.options.onStateChange?.(this.arduino.getState());
  }

  private setStatus(status: SimulationStatus): void {
    this.status = status;
    this.emit();
  }

  setCircuit(nodes: Node[], edges: Edge<CircuitEdgeData>[]): void {
    this.circuitNodes = nodes;
    this.circuitEdges = edges;
    this.netlist = this.netlistBuilder.build(createCircuitGraph(nodes, edges));
  }

  loadHex(hex: string): void {
    const program = intelHexToProgram(hex);
    if (program.length === 0) throw new Error("Compiled firmware is empty.");
    this.arduino.reset();
    this.avr.loadProgram(program, this.arduino);
    this.digitalStates = new Map();
    this.firmwareLoaded = true;
  }

  start(): void {
    if (this.clock.isRunning()) return;
    if (!this.netlist) throw new Error("Circuit topology has not been built.");
    if (!this.firmwareLoaded) throw new Error("Compile the Arduino sketch before starting simulation.");
    this.setStatus("running");
    this.clock.start(() => this.tick());
  }

  private tick(): void {
    try {
      this.avr.runCycles(this.cyclesPerFrame);
      if (this.netlist) {
        this.digitalStates = this.digitalSolver.solve(
          this.netlist,
          this.arduino.getDigitalDrivers(),
        );
        this.applyLedStates();
      }
      this.emit();
    } catch (error) {
      this.clock.stop();
      const err = error instanceof Error ? error : new Error(String(error));
      this.setStatus("error");
      this.options.onError?.(err);
    }
  }

  private applyLedStates(): void {
    if (!this.netlist) return;

    for (const node of this.circuitNodes) {
      const type = String(node.data?.componentType ?? node.type ?? "").toLowerCase();
      if (!type.includes("led")) continue;

      const anodePinId = String(node.data?.anodePinId ?? "anode");
      const cathodePinId = String(node.data?.cathodePinId ?? "cathode");
      const anode = this.digitalSolver.getPinLevel(
        this.netlist, this.digitalStates, node.id, anodePinId,
      );
      const cathode = this.digitalSolver.getPinLevel(
        this.netlist, this.digitalStates, node.id, cathodePinId,
      );

      this.arduino.getState().ledStates[node.id] = {
        id: node.id,
        isOn: anode === 1 && cathode === 0,
        brightness: anode === 1 && cathode === 0 ? 1 : 0,
        color: typeof node.data?.color === "string" ? node.data.color : undefined,
      };
    }
  }

  pause(): void { this.clock.stop(); this.setStatus("paused"); }

  stop(): void {
    this.clock.stop();
    this.arduino.reset();
    this.digitalStates = new Map();
    this.setStatus("stopped");
  }

  reset(): void {
    this.clock.stop();
    this.arduino.reset();
    this.avr.reset();
    this.digitalStates = new Map();
    this.netlist = null;
    this.firmwareLoaded = false;
    this.setStatus("idle");
  }

  getArduino(): ArduinoUnoRuntime { return this.arduino; }
  getAvr(): Avr8jsRunner { return this.avr; }
  getNetlist(): Netlist | null { return this.netlist; }
  getDigitalStates(): DigitalSolveResult { return this.digitalStates; }
}
