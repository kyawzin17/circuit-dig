import type { Node, Edge } from "reactflow";
import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";import type {
  SimulationEngineOptions,
  SimulationStatus,
  ArduinoUnoRuntimeState,
  PinLevel,
} from "../types/simulator.types";
import {
  createCircuitGraph,
  type CircuitEdgeData,
} from "../circuit/CircuitGraph";
import {
  NetlistBuilder,
  type Netlist,
} from "../circuit/NetlistBuilder";
import {
  DigitalCircuitSolver,
  type DigitalCircuitState,
} from "../electrical/DigitalCircuitSolver";
import { intelHexToProgram } from "./IntelHex";

/* =========================================================
   ENGINE OPTIONS
========================================================= */

export interface CircuitSimulationEngineOptions
  extends SimulationEngineOptions {
  arduinoNodeId?: string;

  nodes?: Node[];

  edges?: Edge<CircuitEdgeData>[];
}

/* =========================================================
   ENGINE
========================================================= */

export class SimulationEngine {
  private status: SimulationStatus = "idle";
  private readonly arduino = new ArduinoUnoRuntime();
  private readonly avr = new Avr8jsRunner();
  private readonly clock = new SimulationClock();
  private readonly netlistBuilder = new NetlistBuilder();
  private readonly digitalSolver = new DigitalCircuitSolver();
  private readonly options: SimulationEngineOptions;

  private netlist: Netlist | null = null;
  private circuitNodes: Node[] = [];
  private circuitEdges: Edge<CircuitEdgeData>[] = [];
  private digitalState: DigitalCircuitState = {
    pinLevels: new Map(),
    conflicts: [],
  };
  private firmwareLoaded = false;

  private readonly cyclesPerFrame: number;

  constructor(options: SimulationEngineOptions = {}) {
    this.options = options;
    const frequency =
      options.config?.frequency ?? 16_000_000;

    this.cyclesPerFrame = Math.max(
      1,
      Math.floor(frequency / 60)
    );
  }

  getStatus(): SimulationStatus {
    return this.status;
  }

  private emit(): void {
    this.options.onStateChange?.(
      this.arduino.getState()
    );
  }

  private setStatus(
    status: SimulationStatus
  ): void {
    this.status = status;
    this.emit();
  }

  /**
   * Build the simulator topology from the actual
   * React Flow circuit.
   */
  setCircuit(
    nodes: Node[],
    edges: Edge[]
  ): void {
    this.circuitNodes = nodes;
    this.circuitEdges =
      edges as Edge<CircuitEdgeData>[];

    this.netlist =
      this.netlistBuilder.build(
        createCircuitGraph(
          nodes,
          this.circuitEdges
        )
      );
  }

  /**
   * Load the real HEX output produced by Arduino CLI.
   */
  loadHex(hex: string): void {
    const program = intelHexToProgram(hex);

    if (program.length === 0) {
      throw new Error(
        "Compiled firmware is empty."
      );
    }

    this.arduino.reset();
    this.avr.loadProgram(
      program,
      this.arduino
    );

    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };

    this.firmwareLoaded = true;
    this.setStatus("idle");
  }
  start(): void {
    if (
      this.clock.isRunning()
    ) {
      return;
    }

    if (!this.netlist) {
      throw new Error(
        "Circuit topology has not been built."
      );
    }

    if (!this.firmwareLoaded) {
      throw new Error(
        "Compile the Arduino sketch before starting simulation."
      );
    }

    this.setStatus("running");
    this.clock.start(() => this.tick());
  }

  private tick(): void {
    try {
      // Execute the compiled Arduino machine code.
      // No JavaScript timer decides HIGH/LOW states.
      this.avr.runCycles(
        this.cyclesPerFrame
      );

      // Read the actual GPIO driver states produced
      // by the AVR registers.
      this.digitalState =
        this.digitalSolver.solve(
          this.circuitNodes,
          this.circuitEdges,
          this.arduino.getDigitalDrivers()
        );

      // Translate the solved electrical state into
      // component runtime state.
      this.applyLedStates();

      this.emit();
    } catch (error) {
      this.clock.stop();

      const err =
        error instanceof Error
          ? error
          : new Error(String(error));

      this.setStatus("error");
      this.options.onError?.(err);
    }
  }

  private applyLedStates(): void {
    for (const node of this.circuitNodes) {
      const type = String(
        node.data?.componentType ??
          node.type ??
          ""
      ).toLowerCase();

      if (!type.includes("led")) {
        continue;
      }

      const anode =
        this.digitalSolver.getPinLevel(
          this.digitalState,
          node.id,
          String(
            node.data?.anodePinId ??
              "anode"
          )
        );

      const cathode =
        this.digitalSolver.getPinLevel(
          this.digitalState,
          node.id,
          String(
            node.data?.cathodePinId ??
              "cathode"
          )
        );

      const isOn =
        anode === 1 && cathode === 0;

        console.log(
      "[LED DEBUG]",
      {
        nodeId: node.id,
        anode,
        cathode,
        isOn,
      }
    );

      this.arduino.getState().ledStates[
        node.id
      ] = {
        id: node.id,
        isOn,
        brightness: isOn ? 1 : 0,
        color:
          typeof node.data?.color ===
          "string"
            ? node.data.color
            : undefined,
      };
    }
  }

  pause(): void {
    this.clock.stop();
    this.setStatus("paused");
  }
  stop(): void {
    this.clock.stop();
    this.arduino.reset();
    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };
    this.setStatus("stopped");
  }
  reset(): void {
    this.clock.stop();
    this.arduino.reset();
    this.avr.reset();
    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };
    this.netlist = null;
    this.firmwareLoaded = false;
    this.setStatus("idle");
  }

  getArduino(): ArduinoUnoRuntime {
    return this.arduino;
  }

  getAvr(): Avr8jsRunner {
    return this.avr;
  }

  getNetlist(): Netlist | null {
    return this.netlist;
  }

  getDigitalState(): DigitalCircuitState {
    return this.digitalState;
  }
}
