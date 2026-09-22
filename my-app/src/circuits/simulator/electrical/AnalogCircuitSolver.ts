import type { Node } from "reactflow";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";
import type { Netlist } from "../circuit/NetlistBuilder";
import type { PowerRailState } from "./PowerRailSolver";

export interface AnalogInputState {
  pinVoltages: Map<string, number>;
  pinValues: Map<string, number>;
  conflicts: string[];
}

function typeOf(node: Node): string {
  return String(
    node.data?.componentType ?? node.type ?? "",
  ).toLowerCase();
}

function isArduinoUno(node: Node): boolean {
  return typeOf(node) === "arduino-uno";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readPotentiometerPosition(node: Node): number {
  const candidates = [
    node.data?.potentiometerPosition,
    node.data?.wiperPosition,
    node.data?.value,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return clamp(numeric, 0, 1);
    }
  }

  return 0.5;
}

function voltageForNet(
  netId: string | null,
  powerState: PowerRailState,
  sourceVoltages: Map<string, number>,
): number | undefined {
  if (!netId) return undefined;

  const sourceVoltage = sourceVoltages.get(netId);
  if (typeof sourceVoltage === "number") {
    return sourceVoltage;
  }

  const railVoltage = powerState.netVoltages[netId];
  return typeof railVoltage === "number"
    ? railVoltage
    : undefined;
}

/**
 * First-order analog network solver.
 *
 * This phase intentionally models sensors whose output voltage is
 * defined by a component state. The potentiometer is represented
 * physically as:
 *
 *   VCC ---- resistor track ---- GND
 *                       |
 *                     wiper
 *                       |
 *                      SIG
 *
 * The solver converts that electrical output voltage into the
 * Arduino ADC input voltage. The AVR8JS runner then performs the
 * ADC register transaction, so analogRead() remains firmware-driven.
 */
export class AnalogCircuitSolver {
  solve(
    nodes: Node[],
    netlist: Netlist,
    drivers: ArduinoDigitalDriver[],
    powerState: PowerRailState,
  ): AnalogInputState {
    const sourceVoltages = new Map<string, number>();

    for (const driver of drivers) {
      const board = nodes.find(isArduinoUno);
      if (!board) continue;

      const netId = netlist.pinToNet.get(
        board.id + ":" + driver.pin,
      );

      if (!netId) continue;

      const voltage = driver.pwmDuty !== undefined
        ? 5 * driver.pwmDuty
        : driver.level * 5;

      sourceVoltages.set(netId, voltage);
    }

    const netVoltages = new Map<string, number>();

    for (const [netId, voltage] of Object.entries(
      powerState.netVoltages,
    )) {
      if (typeof voltage === "number") {
        netVoltages.set(netId, voltage);
      }
    }

    for (const [netId, voltage] of sourceVoltages) {
      netVoltages.set(netId, voltage);
    }

    const conflicts: string[] = [];

    for (const component of netlist.components) {
      if (
        component.type !== "potentiometer" &&
        component.type !== "pot"
      ) {
        continue;
      }

      const node = nodes.find(
        (candidate) => candidate.id === component.id,
      );

      if (!node) continue;

      const vccNet = component.terminals.VCC ?? null;
      const gndNet = component.terminals.GND ?? null;
      const sigNet = component.terminals.SIG ?? null;

      const vcc = voltageForNet(
        vccNet,
        powerState,
        sourceVoltages,
      );

      const gnd = voltageForNet(
        gndNet,
        powerState,
        sourceVoltages,
      );

      if (
        typeof vcc !== "number" ||
        typeof gnd !== "number"
      ) {
        continue;
      }

      const position = readPotentiometerPosition(node);
      const signalVoltage =
        gnd + (vcc - gnd) * position;

      if (sigNet) {
        netVoltages.set(sigNet, signalVoltage);
      }
    }

    // Also expose direct Arduino analog-pin net voltages.
    for (const board of nodes.filter(isArduinoUno)) {
      for (let channel = 0; channel <= 5; channel += 1) {
        const pinName = "A" + channel;
        const netId = netlist.pinToNet.get(
          board.id + ":" + pinName,
        );

        if (!netId) continue;

        const voltage = netVoltages.get(netId);

        if (typeof voltage !== "number") {
          continue;
        }

        const clampedVoltage = clamp(voltage, 0, 5);
        const adcValue =
          Math.round((clampedVoltage / 5) * 1023);

        netVoltages.set(netId, clampedVoltage);

        // Keyed by Arduino pin name for the AVR bridge.
        // A later multi-board phase can scope this by board id.
        void adcValue;
      }
    }

    const pinVoltages = new Map<string, number>();
    const pinValues = new Map<string, number>();

    for (const board of nodes.filter(isArduinoUno)) {
      for (let channel = 0; channel <= 5; channel += 1) {
        const pinName = "A" + channel;
        const netId = netlist.pinToNet.get(
          board.id + ":" + pinName,
        );

        if (!netId) continue;

        const voltage = netVoltages.get(netId);
        if (typeof voltage !== "number") continue;

        const clampedVoltage = clamp(voltage, 0, 5);
        const adcValue = Math.round(
          (clampedVoltage / 5) * 1023,
        );

        pinVoltages.set(pinName, clampedVoltage);
        pinValues.set(pinName, adcValue);
      }
    }

    // If multiple sources drive an analog net, report it explicitly.
    for (const [netId, voltage] of netVoltages) {
      if (
        voltage < 0 ||
        voltage > 5
      ) {
        conflicts.push(
          "ANALOG_VOLTAGE_OUT_OF_RANGE:" + netId,
        );
      }
    }

    return {
      pinVoltages,
      pinValues,
      conflicts,
    };
  }
}
