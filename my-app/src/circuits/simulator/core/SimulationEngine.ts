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

import type {
  SimulationEngineOptions,
  SimulationStatus,
  ArduinoUnoRuntimeState,
  PinLevel,
} from "../types/simulator.types";

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

    this.arduino =
      new ArduinoUnoRuntime();

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

  start(): void {
    if (
      this.clock.isRunning()
    ) {
      return;
    }

    if (!this.netlist) {
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

  stop(): void {
    this.clock.stop();

    this.arduino.reset();

    this.digitalNets.clear();

    this.pinLevels.clear();

    this.setStatus(
      "stopped",
    );
  }

  /* =======================================================
     RESET
  ======================================================= */

  reset(): void {
    this.clock.stop();

    this.arduino.reset();

    this.avr.reset();

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