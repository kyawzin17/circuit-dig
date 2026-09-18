<<<<<<< HEAD
import {
  ArduinoUnoRuntime,
} from "../boards/ArduinoUnoRuntime";

import {
  Avr8jsRunner,
} from "./Avr8jsRunner";

import {
  SimulationClock,
} from "./SimulationClock";

import {
  createCircuitGraph,
  type CircuitReactFlowNode,
  type CircuitEdgeData,
} from "../circuit/CircuitGraph";

import {
  NetlistBuilder,
  type Netlist,
} from "../circuit/NetlistBuilder";

import {
  DigitalNetSolver,
  type DigitalNetState,
} from "../electrical/DigitalNetSolver";

import type {
  Edge,
} from "reactflow";

=======
import type { Node, Edge } from "reactflow";
import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
import type {
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

  nodes?: CircuitReactFlowNode[];

  edges?: Edge<CircuitEdgeData>[];
}

/* =========================================================
   ENGINE
========================================================= */

export class SimulationEngine {
<<<<<<< HEAD
  private status:
    SimulationStatus = "idle";

  private readonly arduino:
    ArduinoUnoRuntime;

  private readonly avr:
    Avr8jsRunner;

  private readonly clock:
    SimulationClock;

  private readonly netlistBuilder:
    NetlistBuilder;

  private readonly digitalSolver:
    DigitalNetSolver;

  private readonly options:
    CircuitSimulationEngineOptions;

  private netlist:
    Netlist | null = null;

  private digitalNets:
    Map<string, DigitalNetState> =
      new Map();

  private pinLevels:
    Map<string, PinLevel> =
      new Map();

  constructor(
    options:
      CircuitSimulationEngineOptions = {},
  ) {
    this.options =
      options;
=======
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
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346

    const frequency =
      options.config?.frequency ?? 16_000_000;

<<<<<<< HEAD
    this.avr =
      new Avr8jsRunner();

    this.clock =
      new SimulationClock();

    this.netlistBuilder =
      new NetlistBuilder();

    this.digitalSolver =
      new DigitalNetSolver();
  }

  /* =======================================================
     STATUS
  ======================================================= */

  getStatus():
    SimulationStatus {
    return this.status;
  }

  /* =======================================================
     CIRCUIT
  ======================================================= */

  setCircuit(
    nodes: CircuitReactFlowNode[],
    edges: Edge<CircuitEdgeData>[],
  ): void {
    const graph =
      createCircuitGraph(
        nodes,
        edges,
      );

    this.netlist =
      this.netlistBuilder.build(
        graph,
      );

    this.digitalNets.clear();
    this.pinLevels.clear();
  }

  getNetlist():
    Netlist | null {
    return this.netlist;
  }

  /* =======================================================
     STATUS UPDATE
  ======================================================= */

  private emitState(): void {
    this.options.onStateChange?.(
      this.arduino.getState(),
    );
  }

  private setStatus(
    status: SimulationStatus,
  ): void {
    this.status =
      status;

    this.emitState();
  }

  /* =======================================================
     START
  ======================================================= */
=======
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
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346

  start(): void {
    if (
      this.clock.isRunning()
    ) {
      return;
    }

    if (!this.netlist) {
<<<<<<< HEAD
      this.options.onError?.(
        new Error(
          "Circuit netlist has not been built.",
        ),
      );

      this.setStatus(
        "error",
      );

      return;
    }

    this.setStatus(
      "running",
    );

    this.clock.start(
      () => {
        this.tick();
      },
    );
  }

  /* =======================================================
     TICK
  ======================================================= */

  private tick(): void {
    if (
      !this.netlist
    ) {
      return;
    }

    try {
      /*
       * 1. Execute AVR instructions.
       */
      this.avr.runCycles(
        100,
      );

      /*
       * 2. Read Arduino GPIO
       *    drivers.
       */
      const drivers =
        this.arduino
          .getDigitalDrivers(
            this.options
              .arduinoNodeId ??
              "arduino-uno",
          );

      /*
       * 3. Solve electrical
       *    digital nets.
       */
      const result =
        this.digitalSolver.solve(
          this.netlist,
          drivers,
        );

      this.digitalNets =
        result.nets;

      this.pinLevels =
        result.pinLevels;

      /*
       * 4. Apply circuit state.
       */
      this.applyCircuitState();

      /*
       * 5. Notify UI.
       */
      this.emitState();
    } catch (error) {
      const normalized =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );

      this.options.onError?.(
        normalized,
      );
    }
  }

  /* =======================================================
     APPLY CIRCUIT
  ======================================================= */

  private applyCircuitState():
    void {
    if (!this.netlist) {
      return;
    }

    for (
      const node of
      this.netlist.nodes
    ) {
      if (
        node.componentType !==
        "led"
      ) {
        continue;
      }

      const anodePinId =
        String(
          node.props?.anodePinId ??
          "A",
        );

      const cathodePinId =
        String(
          node.props?.cathodePinId ??
          "K",
        );

      const anodeLevel =
        this.getPinLevel(
          node.id,
          anodePinId,
        );

      const cathodeLevel =
        this.getPinLevel(
          node.id,
          cathodePinId,
        );

      const isOn =
        anodeLevel === 1 &&
        cathodeLevel === 0;

      this.arduino.setLedState(
        node.id,
        isOn,
        isOn ? 1 : 0,
      );
    }
  }

  /* =======================================================
     GET PIN LEVEL
  ======================================================= */

  getPinLevel(
    nodeId: string,
    pinId: string,
  ): PinLevel {
    return (
      this.pinLevels.get(
        `${nodeId}:${pinId}`,
      ) ?? 0
    );
  }

  /* =======================================================
     GET NET LEVEL
  ======================================================= */

  getNetLevel(
    netId: string,
  ): PinLevel {
    return (
      this.digitalNets.get(
        netId,
      )?.level ?? 0
    );
  }

  /* =======================================================
     PAUSE
  ======================================================= */

  pause(): void {
    this.clock.stop();

    this.setStatus(
      "paused",
    );
  }

  /* =======================================================
     STOP
  ======================================================= */

=======
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

>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
  stop(): void {
    this.clock.stop();
    this.arduino.reset();
<<<<<<< HEAD

    this.digitalNets.clear();

    this.pinLevels.clear();

    this.setStatus(
      "stopped",
    );
  }

  /* =======================================================
     RESET
  ======================================================= */

=======
    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };
    this.setStatus("stopped");
  }

>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
  reset(): void {
    this.clock.stop();
    this.arduino.reset();
    this.avr.reset();
<<<<<<< HEAD

    this.digitalNets.clear();

    this.pinLevels.clear();

    this.setStatus(
      "idle",
    );
  }

  /* =======================================================
     ARDUINO
  ======================================================= */

  getArduino():
    ArduinoUnoRuntime {
    return this.arduino;
  }

  /* =======================================================
     AVR
  ======================================================= */

  getAvr():
    Avr8jsRunner {
    return this.avr;
  }

  /* =======================================================
     NETS
  ======================================================= */

  getDigitalNets():
    Map<string, DigitalNetState> {
    return new Map(
      this.digitalNets,
    );
  }
}
=======
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
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
