import type { Node, Edge } from "reactflow";
import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";
import type { SimulationEngineOptions, SimulationStatus } from "../types/simulator.types";
import { createCircuitGraph, type CircuitEdgeData } from "../circuit/CircuitGraph";
import { NetlistBuilder, type Netlist } from "../circuit/NetlistBuilder";
import { intelHexToProgram } from "./IntelHex";

export class SimulationEngine {
  private status: SimulationStatus = "idle";
  private readonly arduino = new ArduinoUnoRuntime();
  private readonly avr = new Avr8jsRunner();
  private readonly clock = new SimulationClock();
  private readonly netlistBuilder = new NetlistBuilder();
  private readonly options: SimulationEngineOptions;
  private netlist: Netlist | null = null;
  private circuitNodes: Node[] = [];
  private circuitEdges: Edge<CircuitEdgeData>[] = [];
  private firmwareLoaded = false;

  constructor(options: SimulationEngineOptions = {}) { this.options = options; }

  getStatus(): SimulationStatus { return this.status; }

  private setStatus(status: SimulationStatus): void {
    this.status = status;
    this.options.onStateChange?.(this.arduino.getState());
  }

  setCircuit(nodes: Node[], edges: Edge<CircuitEdgeData>[]): void {
    this.circuitNodes = nodes;
    this.circuitEdges = edges;
    this.netlist = this.netlistBuilder.build(createCircuitGraph(nodes, edges));
  }

  loadHex(hex: string): void {
    const program = intelHexToProgram(hex);
    if (program.length === 0) throw new Error("Compiled firmware is empty.");
    this.avr.loadProgram(program, this.arduino);
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
      // One animation-frame is about 16.7 ms. Run approximately that many
      // 16 MHz AVR cycles so delay()/millis() progress at real-time speed.
      this.avr.runCycles(267000);
      this.options.onStateChange?.(this.arduino.getState());
    } catch (error) {
      this.clock.stop();
      const err = error instanceof Error ? error : new Error(String(error));
      this.setStatus("error");
      this.options.onError?.(err);
    }
  }

  pause(): void { this.clock.stop(); this.setStatus("paused"); }

  stop(): void {
    this.clock.stop();
    this.arduino.reset();
    this.firmwareLoaded = false;
    this.setStatus("stopped");
  }

  reset(): void {
    this.clock.stop();
    this.arduino.reset();
    this.avr.reset();
    this.netlist = null;
    this.firmwareLoaded = false;
    this.setStatus("idle");
  }

  getArduino(): ArduinoUnoRuntime { return this.arduino; }
  getAvr(): Avr8jsRunner { return this.avr; }
  getNetlist(): Netlist | null { return this.netlist; }
}
