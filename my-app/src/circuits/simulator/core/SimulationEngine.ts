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
  DigitalInputSolver,
  type DigitalInputState,
} from "../electrical/DigitalInputSolver";

import {
  PowerRailSolver,
  type PowerRailState,
} from "../electrical/PowerRailSolver";

import {
  AnalogCircuitSolver,
  type AnalogInputState,
} from "../electrical/AnalogCircuitSolver";

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

  private readonly digitalInputSolver =
    new DigitalInputSolver();

  private readonly currentFlowSolver =
    new CurrentFlowSolver();

  private readonly powerRailSolver =
    new PowerRailSolver();

  private readonly analogCircuitSolver =
    new AnalogCircuitSolver();

  private readonly options: SimulationEngineOptions;

  private netlist: Netlist | null = null;

  private circuitNodes: Node[] = [];

  private circuitEdges: Edge<CircuitEdgeData>[] =
    [];

  private digitalState: DigitalCircuitState = {
    pinLevels: new Map(),
    conflicts: [],
  };

  private digitalInputState: DigitalInputState = {
    pinLevels: new Map(),
    conflicts: [],
    floatingPins: [],
  };

  private currentFlowState: CurrentFlowState = {
    wireStates: {},
    activeNets: new Set(),
    activeComponents: new Set(),
    componentBrightness: {},
    conflicts: [],
  };

  private powerState: PowerRailState = {
    netVoltages: {},
    pinVoltages: {},
    sourceNets: new Map(),
    groundNets: new Set(),
    conflicts: [],
  };

  private analogState: AnalogInputState = {
    pinVoltages: new Map(),
    pinValues: new Map(),
    digitalOutputs: new Map(),
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
   * Update live component state without rebuilding topology.
   *
   * This is used for interactive controls such as a pushbutton:
   * the wire graph stays the same, while the component's pressed
   * state changes while the simulation is already running.
   */
  updateNodes(nodes: Node[]): void {
    this.circuitNodes = nodes;
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
      componentBrightness: {},
      conflicts: [],
    };

    this.digitalInputState = {
      pinLevels: new Map(),
      conflicts: [],
      floatingPins: [],
    };

    this.powerState = {
      netVoltages: {},
      pinVoltages: {},
      sourceNets: new Map(),
      groundNets: new Set(),
      conflicts: [],
    };

    this.analogState = {
      pinVoltages: new Map(),
      pinValues: new Map(),
      digitalOutputs: new Map(),
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
       * The circuit is resolved twice around AVR execution:
       *
       *   circuit -> power -> input -> PINx
       *                         |
       *                         v
       *                      AVR8JS
       *                         |
       *                         v
       *                  GPIO outputs/PWM
       *                         |
       *                         v
       *                final circuit solve
       *
       * This is what makes digitalRead() a real firmware read of
       * the simulated electrical circuit rather than a JavaScript
       * shortcut.
       */
      if (this.netlist) {
        const preRunDrivers =
          this.arduino.getDigitalDrivers();

        this.powerState =
          this.powerRailSolver.solve(
            this.netlist,
            this.arduino.getPowerDrivers(),
            preRunDrivers,
            this.circuitNodes,
          );

        /*
         * Resolve analog voltages before AVR execution.
         *
         * A potentiometer is an electrical component with VCC/GND
         * and a wiper output. The solver determines the voltage at
         * SIG; the AVR runner later converts that voltage through
         * the ATmega328P ADC registers used by analogRead().
         */
        this.analogState =
          this.analogCircuitSolver.solve(
            this.circuitNodes,
            this.netlist,
            preRunDrivers,
            this.powerState,
          );

        this.arduino.getState().analogPinVoltages = {};
        this.arduino.getState().analogPinValues = {};

        for (const [pin, voltage] of this.analogState.pinVoltages) {
          const value =
            this.analogState.pinValues.get(pin) ?? 0;

          this.arduino.setAnalogInput(
            pin,
            voltage,
            value,
          );
        }

        if (this.firmwareLoaded) {
          const externalAnalogInputs: Record<string, number> = {};

          for (const [pin, voltage] of this.analogState.pinVoltages) {
            externalAnalogInputs[pin] = voltage;
          }

          this.avr.setExternalAnalogInputs(
            externalAnalogInputs,
          );
        }

        this.digitalInputState =
          this.digitalInputSolver.solve(
            this.circuitNodes,
            this.netlist,
            preRunDrivers,
            this.powerState,
            this.arduino.getDigitalInputModes(),
            this.analogState.digitalOutputs,
          );

        for (const [
          pinKey,
          level,
        ] of this.digitalInputState.pinLevels) {
          const separator =
            pinKey.lastIndexOf(":");

          if (separator < 0) {
            continue;
          }

          const nodeId =
            pinKey.slice(0, separator);

          const pinId =
            pinKey.slice(separator + 1);

          if (!/^D\d+$/i.test(pinId)) {
            continue;
          }

          const pinNumber =
            Number(pinId.slice(1));

          const node =
            this.circuitNodes.find(
              (candidate) =>
                candidate.id === nodeId,
            );

          if (!node) {
            continue;
          }

          this.arduino.setInputLevel(
            pinNumber,
            level,
          );
        }

        if (this.firmwareLoaded) {
          const externalLevels: Record<
            string,
            0 | 1
          > = {};

          for (const [
            pinKey,
            level,
          ] of this.digitalInputState.pinLevels) {
            const separator =
              pinKey.lastIndexOf(":");

            if (separator < 0) {
              continue;
            }

            externalLevels[
              pinKey.slice(
                separator + 1,
              )
            ] = level;
          }

          this.avr.setExternalDigitalInputs(
            externalLevels,
          );

          this.avr.runCycles(
            this.cyclesPerFrame,
          );
        }
      }

      const digitalDrivers =
        this.arduino.getDigitalDrivers();

      this.digitalState =
        this.digitalSolver.solve(
          this.circuitNodes,
          this.circuitEdges,
          digitalDrivers,
        );

      if (this.netlist) {
        this.powerState =
          this.powerRailSolver.solve(
            this.netlist,
            this.arduino.getPowerDrivers(),
            digitalDrivers,
            this.circuitNodes,
          );

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

      const solvedBrightness =
        this.currentFlowState.componentBrightness[
          node.id
        ];

      const brightness =
        isOn
          ? (
              typeof solvedBrightness === "number"
                ? solvedBrightness
                : 1
            )
          : 0;

      this.arduino.getState().ledStates[
        node.id
      ] = {
        id: node.id,
        isOn,
        brightness,
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

    this.analogState = {
      pinVoltages: new Map(),
      pinValues: new Map(),
      conflicts: [],
    };



    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };

    this.currentFlowState = {
      wireStates: {},
      activeNets: new Set(),
      activeComponents: new Set(),
      componentBrightness: {},
      conflicts: [],
    };

    this.digitalInputState = {
      pinLevels: new Map(),
      conflicts: [],
      floatingPins: [],
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

    this.analogState = {
      pinVoltages: new Map(),
      pinValues: new Map(),
      conflicts: [],
    };



    this.digitalState = {
      pinLevels: new Map(),
      conflicts: [],
    };

    this.currentFlowState = {
      wireStates: {},
      activeNets: new Set(),
      activeComponents: new Set(),
      componentBrightness: {},
      conflicts: [],
    };

    this.digitalInputState = {
      pinLevels: new Map(),
      conflicts: [],
      floatingPins: [],
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

  getDigitalInputState(): DigitalInputState {
    return this.digitalInputState;
  }

  getCurrentFlowState(): CurrentFlowState {
    return this.currentFlowState;
  }

  getPowerState(): PowerRailState {
    return this.powerState;
  }

  getAnalogState(): AnalogInputState {
    return this.analogState;
  }

  getState(): ArduinoUnoRuntimeState {
    return this.arduino.getState();
  }
}
