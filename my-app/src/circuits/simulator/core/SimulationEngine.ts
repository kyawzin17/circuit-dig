import type { Node, Edge } from "reactflow";

import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";

import type {
  SimulationEngineOptions,
  SimulationStatus,
  ArduinoUnoRuntimeState,
  SimulationDiagnostics,
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
    componentCurrentMa: {},
    componentVoltageDrop: {},
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
    sensorVoltages: new Map(),
    sensorResistanceOhms: new Map(),
    conflicts: [],
  };

  private firmwareLoaded = false;

  private readonly cyclesPerFrame: number;
  private simulatedCycles = 0;
  private frameCount = 0;

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
      componentCurrentMa: {},
      componentVoltageDrop: {},
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
      sensorVoltages: new Map(),
      sensorResistanceOhms: new Map(),
      conflicts: [],
    };

    this.firmwareLoaded = true;
    this.simulatedCycles = 0;
    this.frameCount = 0;
    this.refreshDiagnostics();
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
      this.frameCount += 1;
      this.simulatedCycles += this.cyclesPerFrame;
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

          if (!/^(?:D|A)\d+$/i.test(pinId)) {
            continue;
          }

          const channel = Number(pinId.slice(1));
          const pinNumber =
            /^A/i.test(pinId)
              ? 14 + channel
              : channel;

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
      this.applySevenSegmentStates();
      this.refreshDiagnostics();

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

  private refreshDiagnostics(): void {
    const diagnostics: SimulationDiagnostics = {
      simulatedCycles: this.simulatedCycles,
      simulatedMs: (this.simulatedCycles / (this.options.config?.frequency ?? 16_000_000)) * 1000,
      frameCount: this.frameCount,
      pins: [],
      nets: [],
      components: [],
      faults: [],
    };

    const netlist = this.netlist;
    if (!netlist) {
      this.arduino.getState().diagnostics = diagnostics;
      return;
    }

    for (const [netId, pins] of netlist.netToPins) {
      const active = this.currentFlowState.activeNets.has(netId);
      const currents = Array.from(netlist.wireToNet.entries())
        .filter(([, id]) => id === netId)
        .map(([wireId]) => this.currentFlowState.wireStates[wireId]?.currentMa)
        .filter((value): value is number => typeof value === "number");
      diagnostics.nets.push({
        netId,
        voltage: this.powerState.netVoltages[netId],
        currentMa: currents.length ? Math.max(...currents) : undefined,
        active,
        pins: pins.map((pin) => `${pin.nodeId}:${pin.pinId}`),
      });
    }

    for (const [pin, runtime] of Object.entries(this.arduino.getState().digitalPins)) {
      diagnostics.pins.push({
        pin: `D${Number(pin)}`,
        digitalLevel: runtime.level,
        mode: runtime.mode,
        voltage: runtime.mode === "output" ? runtime.level * 5 : undefined,
      });
    }

    for (const [pin, voltage] of Object.entries(this.arduino.getState().analogPinVoltages)) {
      diagnostics.pins.push({ pin, voltage });
    }

    for (const driver of this.arduino.getPowerDrivers()) {
      diagnostics.pins.push({ pin: driver.pin, voltage: driver.voltage });
    }

    const nodeById = new Map(this.circuitNodes.map((node) => [node.id, node]));
    for (const component of netlist.components) {
      const node = nodeById.get(component.id);
      if (!node) continue;
      const type = String(node.data?.componentType ?? node.type ?? "unknown").toLowerCase();
      const active = this.currentFlowState.activeComponents.has(component.id);
      const currentMa = this.currentFlowState.componentCurrentMa[component.id];
      const voltageDrop = this.currentFlowState.componentVoltageDrop[component.id] ?? (type.includes("led") && active ? 2 : undefined);
      diagnostics.components.push({
        id: component.id, type, voltageDrop, currentMa,
        powerMw: currentMa !== undefined && voltageDrop !== undefined ? currentMa * voltageDrop : undefined,
        active,
      });
    }

    diagnostics.faults = Array.from(new Set([
      ...this.powerState.conflicts,
      ...this.currentFlowState.conflicts,
      ...this.digitalState.conflicts,
      ...this.digitalInputState.conflicts,
      ...this.analogState.conflicts,
    ]));

    this.arduino.getState().diagnostics = diagnostics;
  }

  /** Execute exactly one simulation frame without starting the animation clock. */
  step(): void {
    if (this.clock.isRunning()) return;
    if (!this.netlist) throw new Error("Circuit topology has not been built.");
    this.tick();
  }

  getDiagnostics(): SimulationDiagnostics {
    return this.arduino.getState().diagnostics;
  }
  private applySevenSegmentStates(): void {
    if (!this.netlist) {
      return;
    }

    const state = this.arduino.getState().sevenSegmentStates;
    const segmentNames = ["A", "B", "C", "D", "E", "F", "G", "DP"];
    const drivers = this.arduino.getDigitalDrivers();

    const netHasDriverLevel = (
      netId: string,
      level: 0 | 1,
      visited = new Set<string>(),
    ): boolean => {
      if (visited.has(netId)) {
        return false;
      }

      visited.add(netId);

      const pins = this.netlist!.netToPins.get(netId) ?? [];
      if (
        pins.some((pin) =>
          drivers.some(
            (driver) =>
              driver.pin.toUpperCase() === pin.pinId.toUpperCase() &&
              (
                driver.level === level ||
                (
                  driver.pwmDuty !== undefined &&
                  driver.pwmDuty > 0 &&
                  level === 1
                )
              ),
          ),
        )
      ) {
        return true;
      }

      /*
       * A 7-segment segment is normally driven through a resistor.
       * Follow resistor-only links so the display state remains tied
       * to the actual AVR GPIO driver rather than a UI shortcut.
       */
      for (const resistor of this.netlist!.components) {
        if (resistor.type !== "resistor") {
          continue;
        }

        const pin1 = resistor.terminals.pin1;
        const pin2 = resistor.terminals.pin2;

        if (pin1 === netId && pin2) {
          if (netHasDriverLevel(pin2, level, new Set(visited))) {
            return true;
          }
        }

        if (pin2 === netId && pin1) {
          if (netHasDriverLevel(pin1, level, new Set(visited))) {
            return true;
          }
        }
      }

      return false;
    };

    for (const component of this.netlist.components) {
      const node = this.circuitNodes.find((candidate) => candidate.id === component.id);
      if (!node) continue;

      const type = String(
        node.data?.componentType ?? node.type ?? "",
      ).toLowerCase();

      if (
        type !== "7segment" &&
        type !== "sevensegment" &&
        type !== "seven-segment"
      ) {
        continue;
      }

      const props =
        node.data?.props &&
        typeof node.data.props === "object"
          ? (node.data.props as Record<string, unknown>)
          : {};

      const common =
        String(props.common ?? node.data?.common ?? "anode").toLowerCase() ===
        "cathode"
          ? "cathode"
          : "anode";

      const parsedDigits = Number(props.digits ?? node.data?.digits ?? 1);
      const digits = [1, 2, 3, 4].includes(parsedDigits)
        ? parsedDigits
        : 1;

      const values: number[] = [];
      let anyColon = false;

      for (let digitIndex = 0; digitIndex < digits; digitIndex += 1) {
        const commonPin =
          digits === 1
            ? (component.terminals["COM.1"]
                ? "COM.1"
                : component.terminals["COM.2"]
                  ? "COM.2"
                  : "COM")
            : "DIG" + (digitIndex + 1);

        const commonNet = component.terminals[commonPin];

        const commonEnabled =
          typeof commonNet === "string" &&
          (
            common === "cathode"
              ? (
                  this.powerState.groundNets.has(commonNet) ||
                  netHasDriverLevel(commonNet, 0)
                )
              : (
                  this.powerState.sourceNets.has(commonNet) ||
                  netHasDriverLevel(commonNet, 1)
                )
          );

        for (const segmentName of segmentNames) {
          const segmentNet = component.terminals[segmentName];

          const lit =
            commonEnabled &&
            typeof segmentNet === "string" &&
            (
              this.currentFlowState.activeNets.has(segmentNet) ||
              (
                common === "cathode"
                  ? netHasDriverLevel(segmentNet, 1)
                  : netHasDriverLevel(segmentNet, 0)
              )
            );

          values.push(lit ? 1 : 0);
        }

        if (digitIndex === 0) {
          const colonNet = component.terminals.CLN;
          anyColon =
            commonEnabled &&
            typeof colonNet === "string" &&
            this.currentFlowState.activeNets.has(colonNet);
        }
      }

      state[node.id] = {
        id: node.id,
        digits,
        common,
        values,
        colon: anyColon,
      };
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
    this.simulatedCycles = 0;
    this.frameCount = 0;

    this.analogState = {
      pinVoltages: new Map(),
      pinValues: new Map(),
      digitalOutputs: new Map(),
      sensorVoltages: new Map(),
      sensorResistanceOhms: new Map(),
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
      componentCurrentMa: {},
      componentVoltageDrop: {},
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
    this.simulatedCycles = 0;
    this.frameCount = 0;
    this.avr.reset();

    this.analogState = {
      pinVoltages: new Map(),
      pinValues: new Map(),
      digitalOutputs: new Map(),
      sensorVoltages: new Map(),
      sensorResistanceOhms: new Map(),
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
      componentCurrentMa: {},
      componentVoltageDrop: {},
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
