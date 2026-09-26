import type { Node, Edge } from "reactflow";

import { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";
import { Avr8jsRunner } from "./Avr8jsRunner";
import { SimulationClock } from "./SimulationClock";

import type {
  SimulationEngineOptions,
  SimulationStatus,
  ArduinoUnoRuntimeState,
  SimulationDiagnostics,
  SimulationTrace,
  SimulationTraceStep,
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
import {
  Lcd1602Runtime,
  Lcd1602I2cEventHandler,
} from "../components/Lcd1602Runtime";

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
  private activeTrace: SimulationTrace | undefined;

  /**
   * Last observed TRIG level for each HC-SR04.
   * The AVR runner reports GPIO edges while executing the real firmware.
   */
  private readonly ultrasonicTriggerLevels =
    new Map<string, 0 | 1>();

  private readonly lcdRuntimes =
    new Map<string, Lcd1602Runtime>();

  private lcdI2cHandler:
    Lcd1602I2cEventHandler | null = null;

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

  private detectParallelLcdMode(
    node: Node,
  ): "4bit" | "8bit" {
    const configured =
      node.data?.lcdMode;

    if (
      typeof configured === "string" &&
      configured.toLowerCase() === "8bit"
    ) {
      return "8bit";
    }

    const graph =
      createCircuitGraph(
        this.circuitNodes,
        this.circuitEdges,
      );

    const wiredPins = new Set<string>();

    for (const wire of graph.wires) {
      for (const ref of [wire.source, wire.target]) {
        if (ref.nodeId === node.id) {
          wiredPins.add(
            ref.pinId.toUpperCase(),
          );
        }
      }
    }

    return ["D0", "D1", "D2", "D3"].some(
      (pin) => wiredPins.has(pin),
    )
      ? "8bit"
      : "4bit";
  }

  private isLcdPowered(
    component: {
      terminals: Record<string, string | null>;
    },
  ): boolean {
    const vcc =
      component.terminals.VDD ??
      component.terminals.VCC ??
      null;

    const gnd =
      component.terminals.VSS ??
      component.terminals.GND ??
      null;

    return Boolean(
      vcc &&
      gnd &&
      (
        this.powerState.sourceNets.has(vcc) ||
        this.powerState.netVoltages[vcc] === 5 ||
        this.powerState.netVoltages[vcc] === 3.3
      ) &&
      this.powerState.groundNets.has(gnd),
    );
  }

  private isLcdI2cConnected(
    componentId: string,
  ): boolean {
    if (!this.netlist) {
      return false;
    }

    const component =
      this.netlist.components.find(
        (item) => item.id === componentId,
      );

    if (!component) {
      return false;
    }

    const netHasArduinoPin = (
      netId: string | null | undefined,
      pinName: string,
    ): boolean => {
      if (!netId) {
        return false;
      }

      return (
        this.netlist!.netToPins
          .get(netId)
          ?.some(
            (pin) =>
              pin.pinId.toUpperCase() ===
              pinName.toUpperCase(),
          ) ?? false
      );
    };

    /*
     * Arduino UNO hardware TWI is on A4/SDA and A5/SCL.
     * Require the actual circuit topology to connect both lines.
     * VCC/GND must also exist on the LCD component.
     */
    return (
      netHasArduinoPin(
        component.terminals.SDA,
        "A4",
      ) &&
      netHasArduinoPin(
        component.terminals.SCL,
        "A5",
      ) &&
      this.isLcdPowered(component)
    );
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

    this.activeTrace = undefined;
    this.ultrasonicTriggerLevels.clear();
    this.lcdRuntimes.clear();
    this.lcdI2cHandler = null;

    for (const node of nodes) {
      const type = String(
        node.data?.componentType ??
          node.type ??
          "",
      ).toLowerCase();

      if (
        type === "lcd1602" ||
        type === "lcd-1602" ||
        type === "lcd1602-full"
      ) {
        const mode = this.detectParallelLcdMode(node);
        this.lcdRuntimes.set(
          node.id,
          new Lcd1602Runtime(node.id, mode),
        );
      } else if (
        type === "lcd1602-i2c" ||
        type === "lcd1602_i2c" ||
        type === "lcd-i2c"
      ) {
        const props =
          node.data?.props &&
          typeof node.data.props === "object"
            ? (node.data.props as Record<string, unknown>)
            : {};

        const configuredAddress =
          props.address ??
          props.i2cAddress ??
          node.data?.i2cAddress;

        const address =
          configuredAddress === undefined
            ? undefined
            : Number(configuredAddress);

        this.lcdRuntimes.set(
          node.id,
          new Lcd1602Runtime(
            node.id,
            "i2c",
            address !== undefined && Number.isFinite(address)
              ? address
              : undefined,
          ),
        );
      }
    }

    this.arduino.getState().buzzerStates = {};
    this.arduino.getState().ultrasonicStates = {};
    this.arduino.getState().lcdStates = {};
    this.arduino.getState().sevenSegmentStates = {};
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

    for (const lcd of this.lcdRuntimes.values()) {
      lcd.reset(
        lcd.getState().mode,
        lcd.getState().i2cAddress,
      );
    }

    this.lcdI2cHandler =
      new Lcd1602I2cEventHandler(
        () => Array.from(this.lcdRuntimes.values()),
        this.avr.getTwi()!,
        (display) =>
          this.isLcdI2cConnected(display.id),
      );

    this.avr.setTwiEventHandler(
      this.lcdI2cHandler,
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
            (change) =>
              this.handleGpioChange(change.pin, change.level, change.cycle),
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
      this.applyLcdStates();
      this.applyBuzzerStates();
      this.applyUltrasonicStates();
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
      trace: this.activeTrace,
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
      const active =
        this.currentFlowState.activeComponents.has(component.id) ||
        (type === "buzzer" &&
          this.arduino.getState().buzzerStates[component.id]?.active === true) ||
        ((type === "hc-sr04" || type === "ultrasonic") &&
          (
            this.arduino.getState().ultrasonicStates[component.id]?.echoHigh === true ||
            this.arduino.getState().ultrasonicStates[component.id]?.triggerActive === true
          ));
      const currentMa = this.currentFlowState.componentCurrentMa[component.id] ??
        this.arduino.getState().buzzerStates[component.id]?.currentMa;
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
  private handleGpioChange(
    pin: string,
    level: 0 | 1,
    cycle: number,
  ): void {
    if (!this.netlist) {
      return;
    }

    /*
     * LCD parallel bus transactions are latched on E's falling edge.
     * The AVR runner calls this from the real PORT register transitions,
     * so the LCD observes firmware-generated bus timing rather than
     * receiving text directly from the React UI.
     */
    this.processParallelLcdGpioChange(pin);

    for (const component of this.netlist.components) {
      const node =
        this.circuitNodes.find(
          (candidate) => candidate.id === component.id,
        );

      if (!node) {
        continue;
      }

      const type = String(
        node.data?.componentType ??
          node.type ??
          "",
      ).toLowerCase();

      if (type !== "hc-sr04" && type !== "ultrasonic") {
        continue;
      }

      const trigNet =
        component.terminals.TRIG ??
        component.terminals.trig;

      if (!trigNet) {
        continue;
      }

      const trigPins =
        this.netlist.netToPins.get(trigNet) ?? [];

      const isConnectedToPin =
        trigPins.some(
          (ref) =>
            ref.pinId.toUpperCase() ===
            pin.toUpperCase(),
        );

      if (!isConnectedToPin) {
        continue;
      }

      const previous =
        this.ultrasonicTriggerLevels.get(node.id) ?? 0;

      this.ultrasonicTriggerLevels.set(
        node.id,
        level,
      );

      /*
       * HC-SR04 starts a measurement after a HIGH trigger pulse.
       * Arduino code normally drives TRIG HIGH for >=10us then LOW.
       * We schedule the ECHO pulse on the falling edge, after a small
       * acoustic/processing delay. The pulse width follows the real
       * HC-SR04 relation: distance(cm) = echo_us / 58.
       */
      if (previous === 1 && level === 0) {
        const props =
          node.data?.props &&
          typeof node.data.props === "object"
            ? (node.data.props as Record<string, unknown>)
            : {};

        const rawDistance =
          node.data?.ultrasonicDistanceCm ??
          props.distance ??
          100;

        const distanceCm = Math.max(
          2,
          Math.min(
            400,
            Number(rawDistance) || 100,
          ),
        );

        const echoDelayUs = 100;
        const echoPulseUs = distanceCm * 58;
        const echoStartCycle =
          cycle +
          Math.round(echoDelayUs * 16);

        const echoDurationCycles =
          Math.max(
            1,
            Math.round(echoPulseUs * 16),
          );

        const echoNet =
          component.terminals.ECHO ??
          component.terminals.echo;

        if (!echoNet) {
          continue;
        }

        const echoPins =
          this.netlist.netToPins.get(echoNet) ?? [];

        for (const echoPin of echoPins) {
          if (!/^(?:D|A)\d+$/i.test(echoPin.pinId)) {
            continue;
          }

          this.avr.scheduleDigitalPulse(
            echoPin.pinId.toUpperCase(),
            echoStartCycle,
            echoDurationCycles,
          );
        }
      }
    }
  }

  private applyLcdStates(): void {
    const runtimeState =
      this.arduino.getState().lcdStates;

    for (const [id, runtime] of this.lcdRuntimes) {
      runtimeState[id] = runtime.getState();
    }
  }

  private processParallelLcdGpioChange(
    pin: string,
  ): void {
    if (!this.netlist) {
      return;
    }

    for (const component of this.netlist.components) {
      const runtime =
        this.lcdRuntimes.get(component.id);

      if (
        !runtime ||
        runtime.getState().mode === "i2c" ||
        !this.isLcdPowered(component)
      ) {
        continue;
      }

      const enableNet = component.terminals.E;
      if (!enableNet) {
        continue;
      }

      const enablePins =
        this.netlist.netToPins.get(enableNet) ?? [];

      const isEnablePin =
        enablePins.some(
          (ref) =>
            ref.pinId.toUpperCase() ===
            pin.toUpperCase(),
        );

      if (!isEnablePin) {
        continue;
      }

      const resolveDigitalPin = (
        netId: string | null | undefined,
      ): string | null => {
        if (!netId) {
          return null;
        }

        const pins =
          this.netlist!.netToPins.get(netId) ?? [];

        const ref =
          pins.find((candidate) =>
            /^(?:D|A)\\d+$/i.test(candidate.pinId),
          );

        return ref?.pinId.toUpperCase() ?? null;
      };

      const rsPin =
        resolveDigitalPin(component.terminals.RS);
      const rwPin =
        resolveDigitalPin(component.terminals.RW);
      const ePin =
        resolveDigitalPin(component.terminals.E);

      if (!ePin) {
        continue;
      }

      const dataPins = ["D0","D1","D2","D3","D4","D5","D6","D7"]
        .map((name) => ({
          name,
          pin: resolveDigitalPin(
            component.terminals[name],
          ),
        }));

      const readLevel = (gpioPin: string | null): 0 | 1 =>
        gpioPin
          ? this.avr.getGpioLevel(gpioPin)
          : 0;

      const levels = dataPins.reduce(
        (value, item, index) =>
          value |
          (readLevel(item.pin) << index),
        0,
      );

      const mode = runtime.getState().mode;
      const data =
        mode === "8bit"
          ? levels
          : (
              (levels >> 4) & 0x0f
            );

      runtime.processParallelEdge({
        rs: readLevel(rsPin),
        rw: readLevel(rwPin),
        enable: readLevel(ePin),
        data,
      });
    }
  }

  private applySevenSegmentStates(): void {
    if (!this.netlist) {
      return;
    }

    const runtimeState =
      this.arduino.getState().sevenSegmentStates;

    const segmentNames = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "DP",
    ];

    const drivers =
      this.arduino.getDigitalDrivers();

    const netHasDriverLevel = (
      netId: string,
      level: 0 | 1,
      visited = new Set<string>(),
    ): boolean => {
      if (visited.has(netId)) {
        return false;
      }

      visited.add(netId);

      const pins =
        this.netlist!.netToPins.get(netId) ?? [];

      if (
        pins.some((pin) =>
          drivers.some((driver) =>
            driver.pin.toUpperCase() ===
              pin.pinId.toUpperCase() &&
            (
              driver.level === level ||
              (
                level === 1 &&
                (driver.pwmDuty ?? 0) > 0
              )
            ),
          ),
        )
      ) {
        return true;
      }

      /*
       * Segment pins are commonly connected through a current
       * limiting resistor. Follow resistor-only links so the
       * display state is derived from the real circuit topology.
       */
      for (const resistor of this.netlist!.components) {
        if (resistor.type !== "resistor") {
          continue;
        }

        const pin1 =
          resistor.terminals.pin1;
        const pin2 =
          resistor.terminals.pin2;

        if (
          pin1 === netId &&
          pin2 &&
          netHasDriverLevel(
            pin2,
            level,
            new Set(visited),
          )
        ) {
          return true;
        }

        if (
          pin2 === netId &&
          pin1 &&
          netHasDriverLevel(
            pin1,
            level,
            new Set(visited),
          )
        ) {
          return true;
        }
      }

      return false;
    };

    for (const component of this.netlist.components) {
      const node =
        this.circuitNodes.find(
          (candidate) =>
            candidate.id === component.id,
        );

      if (!node) {
        continue;
      }

      const type = String(
        node.data?.componentType ??
          node.type ??
          "",
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

      const configuredCommon =
        String(
          props.common ??
            node.data?.common ??
            "anode",
        ).toLowerCase() === "cathode"
          ? "cathode"
          : "anode";

      const parsedDigits =
        Number(
          props.digits ??
            node.data?.digits ??
            1,
        );

      const digits =
        [1, 2, 3, 4].includes(
          parsedDigits,
        )
          ? parsedDigits
          : 1;

      const values: number[] = [];
      let colon = false;

      for (
        let digitIndex = 0;
        digitIndex < digits;
        digitIndex += 1
      ) {
        const commonPin =
          digits === 1
            ? (
                component.terminals["COM.1"]
                  ? "COM.1"
                  : component.terminals["COM1"]
                    ? "COM1"
                    : component.terminals["COM.2"]
                      ? "COM.2"
                      : component.terminals["COM2"]
                        ? "COM2"
                        : "COM"
              )
            : "DIG" +
              (digitIndex + 1);

        const commonNet =
          component.terminals[commonPin];

        const common =
          this.powerState.groundNets.has(commonNet)
            ? "cathode"
            : this.powerState.sourceNets.has(commonNet)
              ? "anode"
              : configuredCommon;

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
          const segmentNet =
            component.terminals[
              segmentName
            ];

          const lit =
            commonEnabled &&
            typeof segmentNet === "string" &&
            (
              this.currentFlowState.activeNets.has(
                segmentNet,
              ) ||
              (
                common === "cathode"
                  ? netHasDriverLevel(
                      segmentNet,
                      1,
                    )
                  : netHasDriverLevel(
                      segmentNet,
                      0,
                    )
              )
            );

          values.push(lit ? 1 : 0);
        }

        if (digitIndex === 0) {
          const colonNet =
            component.terminals.CLN;

          colon =
            commonEnabled &&
            typeof colonNet === "string" &&
            this.currentFlowState.activeNets.has(
              colonNet,
            );
        }
      }

      runtimeState[node.id] = {
        id: node.id,
        digits,
        common,
        values,
        colon,
      };
    }
  }

  private applyBuzzerStates(): void {
    if (!this.netlist) {
      return;
    }

    const runtimeState =
      this.arduino.getState().buzzerStates;

    for (const component of this.netlist.components) {
      const node =
        this.circuitNodes.find(
          (candidate) => candidate.id === component.id,
        );

      if (!node) {
        continue;
      }

      const type = String(
        node.data?.componentType ??
          node.type ??
          "",
      ).toLowerCase();

      if (type !== "buzzer") {
        continue;
      }

      const positive =
        component.terminals.positive ??
        component.terminals["2"];

      const negative =
        component.terminals.negative ??
        component.terminals["1"];

      const connectedPins = new Set<string>();

      for (const netId of [positive, negative]) {
        if (!netId) continue;

        for (const pin of this.netlist.netToPins.get(netId) ?? []) {
          if (/^(?:D|A)\d+$/i.test(pin.pinId)) {
            connectedPins.add(pin.pinId.toUpperCase());
          }
        }
      }

      let frequencyHz: number | undefined;

      for (const pin of connectedPins) {
        const measured =
          this.avr.getToggleFrequencyHz(
            pin,
            this.cyclesPerFrame,
          );

        if (
          measured !== undefined &&
          measured >= 20 &&
          (
            frequencyHz === undefined ||
            measured > frequencyHz
          )
        ) {
          frequencyHz = measured;
        }
      }

      const electricalCurrent =
        this.currentFlowState.componentCurrentMa[node.id];

      const active =
        this.currentFlowState.activeComponents.has(node.id) ||
        frequencyHz !== undefined;

      runtimeState[node.id] = {
        id: node.id,
        active,
        currentMa: electricalCurrent,
        frequencyHz,
      };
    }
  }

  private applyUltrasonicStates(): void {
    if (!this.netlist) {
      return;
    }

    const runtimeState =
      this.arduino.getState().ultrasonicStates;

    for (const component of this.netlist.components) {
      const node =
        this.circuitNodes.find(
          (candidate) => candidate.id === component.id,
        );

      if (!node) continue;

      const type = String(
        node.data?.componentType ??
          node.type ??
          "",
      ).toLowerCase();

      if (type !== "hc-sr04" && type !== "ultrasonic") {
        continue;
      }

      const props =
        node.data?.props &&
        typeof node.data.props === "object"
          ? (node.data.props as Record<string, unknown>)
          : {};

      const distanceCm = Math.max(
        2,
        Math.min(
          400,
          Number(
            node.data?.ultrasonicDistanceCm ??
              props.distance ??
              100,
          ) || 100,
        ),
      );

      const echoNet =
        component.terminals.ECHO ??
        component.terminals.echo;

      const echoHigh =
        echoNet
          ? Array.from(
              this.netlist.netToPins.get(echoNet) ?? [],
            ).some((pin) =>
              this.arduino.digitalRead(
                this.pinToRuntimeNumber(pin.pinId),
              ) === 1,
            )
          : false;

      const trigNet =
        component.terminals.TRIG ??
        component.terminals.trig;

      const triggerActive =
        trigNet
          ? Array.from(
              this.netlist.netToPins.get(trigNet) ?? [],
            ).some((pin) =>
              this.arduino.digitalRead(
                this.pinToRuntimeNumber(pin.pinId),
              ) === 1,
            )
          : false;

      runtimeState[node.id] = {
        id: node.id,
        distanceCm,
        echoHigh,
        triggerActive,
        echoPulseUs: distanceCm * 58,
      };
    }
  }

  private pinToRuntimeNumber(pin: string): number {
    if (/^A\d+$/i.test(pin)) {
      return 14 + Number(pin.slice(1));
    }

    if (/^D\d+$/i.test(pin)) {
      return Number(pin.slice(1));
    }

    return -1;
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
    this.ultrasonicTriggerLevels.clear();
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
    this.ultrasonicTriggerLevels.clear();
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
    this.activeTrace = undefined;

    this.setStatus("idle");
  }

  /**
   * Trace one electrical net through the live netlist.
   * Physical wires are nets; components are boundaries between nets.
   */
  traceNet(netId: string): SimulationTrace {
    const netlist = this.netlist;
    const diagnostics = this.arduino.getState().diagnostics;

    if (!netlist || !netlist.netToPins.has(netId)) {
      const trace: SimulationTrace = {
        target: netId,
        status: "blocked",
        summary: "Net was not found in the current circuit.",
        steps: [{ kind: "fault", id: "trace:not-found", label: "NET_NOT_FOUND" }],
        netIds: [],
        componentIds: [],
        faults: ["NET_NOT_FOUND:" + netId],
      };
      this.activeTrace = trace;
      diagnostics.trace = trace;
      this.emit();
      return trace;
    }

    const steps: SimulationTraceStep[] = [];
    const netIds: string[] = [];
    const componentIds: string[] = [];
    const visitedNets = new Set<string>();
    const visitedComponents = new Set<string>();
    const queue: string[] = [netId];
    let reachedSource = false;
    let reachedGround = false;

    const netById = new Map(diagnostics.nets.map((net) => [net.netId, net]));
    const componentById = new Map(diagnostics.components.map((component) => [component.id, component]));

    while (queue.length > 0 && steps.length < 80) {
      const currentNet = queue.shift()!;
      if (visitedNets.has(currentNet)) continue;
      visitedNets.add(currentNet);
      netIds.push(currentNet);

      const netMeasurement = netById.get(currentNet);
      steps.push({
        kind: "net",
        id: currentNet,
        label: currentNet,
        voltage: netMeasurement?.voltage,
        currentMa: netMeasurement?.currentMa,
        active: netMeasurement?.active,
      });

      if (this.powerState.groundNets.has(currentNet)) reachedGround = true;
      if (this.powerState.sourceNets.has(currentNet)) reachedSource = true;

      const pins = netlist.netToPins.get(currentNet) ?? [];
      for (const pin of pins) {
        steps.push({
          kind: "pin",
          id: pin.nodeId + ":" + pin.pinId,
          label: pin.nodeId + ":" + pin.pinId,
        });
      }

      for (const component of netlist.components) {
        const connectedTerminals = Object.entries(component.terminals)
          .filter(([, connectedNet]) => connectedNet === currentNet)
          .map(([terminal]) => terminal);

        if (connectedTerminals.length === 0) continue;

        if (!visitedComponents.has(component.id)) {
          visitedComponents.add(component.id);
          componentIds.push(component.id);
          const measurement = componentById.get(component.id);
          steps.push({
            kind: "component",
            id: component.id,
            label: component.type + " (" + connectedTerminals.join(", ") + ")",
            voltage: measurement?.voltageDrop,
            currentMa: measurement?.currentMa,
            active: measurement?.active,
          });
        }

        for (const otherNet of Object.values(component.terminals)) {
          if (!otherNet || otherNet === currentNet || visitedNets.has(otherNet)) continue;
          queue.push(otherNet);
        }
      }
    }

    const faults = diagnostics.faults.filter((fault) =>
      fault.includes(netId) || fault.startsWith("POWER_CONFLICT") || fault.startsWith("SHORT_CIRCUIT"),
    );

    const status: SimulationTrace["status"] =
      faults.length > 0
        ? "blocked"
        : reachedSource || reachedGround
          ? "complete"
          : "floating";

    const summary =
      status === "complete"
        ? reachedSource && reachedGround
          ? "Trace reaches a source and GND through the circuit."
          : reachedSource
            ? "Trace reaches an electrical source."
            : "Trace reaches GND."
        : status === "blocked"
          ? "Trace is affected by an electrical fault."
          : "Trace does not currently reach a known source or GND.";

    const trace: SimulationTrace = {
      target: netId,
      status,
      summary,
      steps,
      netIds,
      componentIds,
      faults,
    };

    this.activeTrace = trace;
    diagnostics.trace = trace;
    this.emit();
    return trace;
  }

  tracePin(nodeId: string, pinId: string): SimulationTrace {
    const netlist = this.netlist;
    if (!netlist) return this.traceNet("__missing__");

    const netId = netlist.pinToNet.get(nodeId + ":" + pinId);
    if (!netId) return this.traceNet("__missing__");
    return this.traceNet(netId);
  }

  traceComponent(componentId: string): SimulationTrace {
    const netlist = this.netlist;
    if (!netlist) return this.traceNet("__missing__");

    const component = netlist.components.find((item) => item.id === componentId);
    const netId = component
      ? Object.values(component.terminals).find((value): value is string => Boolean(value))
      : undefined;

    if (!netId) return this.traceNet("__missing__");
    return this.traceNet(netId);
  }

  clearTrace(): void {
    this.activeTrace = undefined;
    this.arduino.getState().diagnostics.trace = undefined;
    this.emit();
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
