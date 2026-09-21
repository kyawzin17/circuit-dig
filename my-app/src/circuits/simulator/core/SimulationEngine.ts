import type { Node, Edge } from "reactflow";

import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";

import type {
  SimulationEngineOptions,
  SimulationStatus,
  ArduinoUnoRuntimeState,
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

import {
  CurrentFlowSolver,
  type CurrentFlowState,
} from "../electrical/CurrentFlowSolver";

import {
  PowerRailSolver,
  type PowerRailState,
} from "../electrical/PowerRailSolver";

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

  private readonly arduino =
    new ArduinoUnoRuntime();

  private readonly avr =
    new Avr8jsRunner();

  private readonly clock =
    new SimulationClock();

  private readonly netlistBuilder =
    new NetlistBuilder();

  private readonly digitalSolver =
    new DigitalCircuitSolver();

  private readonly currentFlowSolver =
    new CurrentFlowSolver();

  private readonly powerRailSolver =
    new PowerRailSolver();

  private readonly options: SimulationEngineOptions;

  private netlist: Netlist | null = null;

  private circuitNodes: Node[] = [];

  private circuitEdges: Edge<CircuitEdgeData>[] =
    [];

  private digitalState: DigitalCircuitState = {
    pinLevels: new Map(),
    conflicts: [],
  };

  private currentFlowState: CurrentFlowState = {
    wireStates: {},
    activeNets: new Set(),
    activeComponents: new Set(),
    conflicts: [],
  };

  private powerState: PowerRailState = {
    netVoltages: {},
    pinVoltages: {},
    sourceNets: new Map(),
    groundNets: new Set(),
    conflicts: [],
  };

  private firmwareLoaded = false;

  private readonly cyclesPerFrame: number;

  constructor(
    options: SimulationEngineOptions = {},
  ) {
    this.options = options;

    const frequency =
      options.config?.frequency ??
      16_000_000;

    this.cyclesPerFrame = Math.max(
      1,
      Math.floor(frequency / 60),
    );
  }

  getStatus(): SimulationStatus {
    return this.status;
  }

  private emit(): void {
    this.options.onStateChange?.(
      this.arduino.getState(),
    );
  }

  private setStatus(
    status: SimulationStatus,
  ): void {
    this.status = status;
    this.emit();
  }

  /**
   * Build the simulator topology from the
   * actual React Flow circuit.
   */
  setCircuit(
    nodes: Node[],
    edges: Edge[],
  ): void {
    this.circuitNodes = nodes;

    this.circuitEdges =
      edges as Edge<CircuitEdgeData>[];

    this.netlist =
      this.netlistBuilder.build(
        createCircuitGraph(
          nodes,
          this.circuitEdges,
        ),
      );
  }

  /**
   * Load the real HEX output produced by
   * Arduino CLI.
   */
  loadHex(hex: string): void {
    const program =
      intelHexToProgram(hex);

    if (program.length === 0) {
      throw new Error(
        "Compiled firmware is empty.",
      );
    }

    this.arduino.reset();

    this.avr.loadProgram(
      program,
      this.arduino,
    );

    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };

    this.currentFlowState = {
      wireStates: {},
      activeNets: new Set(),
      activeComponents: new Set(),
      conflicts: [],
    };

    this.powerState = {
      netVoltages: {},
      pinVoltages: {},
      sourceNets: new Map(),
      groundNets: new Set(),
      conflicts: [],
    };

    this.firmwareLoaded = true;
    this.setStatus("idle");
  }

  start(): void {
    if (this.clock.isRunning()) {
      return;
    }

    if (!this.netlist) {
      throw new Error(
        "Circuit topology has not been built.",
      );
    }

    /*
     * Firmware is optional for power-only simulation.
     *
     * With an empty sketch the Uno power rails still exist:
     * 5V, 3.3V, IOREF and GND are available as soon as Run
     * starts. If firmware was loaded, AVR8JS is also executed.
     */
    this.setStatus("running");
    this.clock.start(() => this.tick());
  }

  private tick(): void {
    try {
      /*
       * 1. Execute the actual compiled Arduino
       *    machine code inside AVR8JS when firmware exists.
       *
       *    Power-only runs intentionally skip AVR execution.
       */
      if (this.firmwareLoaded) {
        this.avr.runCycles(
          this.cyclesPerFrame,
        );
      }

      const digitalDrivers =
        this.arduino.getDigitalDrivers();

      /*
       * 2. Resolve digital pin levels from the
       *    actual AVR GPIO driver states.
       */
      this.digitalState =
        this.digitalSolver.solve(
          this.circuitNodes,
          this.circuitEdges,
          digitalDrivers,
        );

      /*
       * 3. Resolve fixed Arduino power rails first.
       */
      if (this.netlist) {
        this.powerState =
          this.powerRailSolver.solve(
            this.netlist,
            this.arduino.getPowerDrivers(),
            digitalDrivers,
            this.circuitNodes,
          );

        /*
         * Keep the public runtime state synchronized with
         * the resolved board power pins.
         */
        for (const driver of this.arduino.getPowerDrivers()) {
          const voltage =
            this.powerState.pinVoltages[
              driver.pin
            ];

          if (typeof voltage === "number") {
            this.arduino.getState().pinVoltages[
              driver.pin
            ] = {
              pin: driver.pin,
              voltage,
              rail: driver.rail,
            };
          }
        }

        /*
         * 4. Resolve source -> component -> GND paths.
         *
         * The current solver now accepts both Arduino
         * digital HIGH sources and fixed power rails.
         */
        this.currentFlowState =
          this.currentFlowSolver.solve(
            this.circuitNodes,
            this.netlist,
            digitalDrivers,
            this.powerState,
          );

        this.arduino.getState().wireStates =
          this.currentFlowState.wireStates;
      }

      /*
       * 5. Translate solved electrical state into
       *    component runtime state.
       */
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
          "",
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
              "anode",
          ),
        );

      const cathode =
        this.digitalSolver.getPinLevel(
          this.digitalState,
          node.id,
          String(
            node.data?.cathodePinId ??
              "cathode",
          ),
        );

      const firmwareDrivenOn =
        anode === 1 &&
        cathode === 0;

      const electricallyPoweredOn =
        this.currentFlowState.activeComponents.has(
          node.id,
        );

      const isOn =
        firmwareDrivenOn ||
        electricallyPoweredOn;

      this.arduino.getState().ledStates[
        node.id
      ] = {
        id: node.id,
        isOn,
        brightness: isOn
          ? 1
          : 0,
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

    this.currentFlowState = {
      wireStates: {},
      activeNets: new Set(),
      activeComponents: new Set(),
      conflicts: [],
    };

    this.powerState = {
      netVoltages: {},
      pinVoltages: {},
      sourceNets: new Map(),
      groundNets: new Set(),
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

    this.currentFlowState = {
      wireStates: {},
      activeNets: new Set(),
      activeComponents: new Set(),
      conflicts: [],
    };

    this.powerState = {
      netVoltages: {},
      pinVoltages: {},
      sourceNets: new Map(),
      groundNets: new Set(),
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

  getCurrentFlowState(): CurrentFlowState {
    return this.currentFlowState;
  }

  getPowerState(): PowerRailState {
    return this.powerState;
  }

  getState(): ArduinoUnoRuntimeState {
    return this.arduino.getState();
  }
}
