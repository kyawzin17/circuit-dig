import type { Node } from "reactflow";
import type { ArduinoDigitalDriver, ArduinoPowerDriver } from "../boards/ArduinoUnoRuntime";
import type { Netlist } from "../circuit/NetlistBuilder";

export interface PowerRailState {
  netVoltages: Record<string, number | undefined>;
  pinVoltages: Record<string, number | undefined>;
  sourceNets: Map<string, number>;
  groundNets: Set<string>;
  conflicts: string[];
}

function addVoltage(
  values: Map<string, number[]>,
  netId: string,
  voltage: number,
): void {
  const current = values.get(netId) ?? [];
  current.push(voltage);
  values.set(netId, current);
}

function uniqueVoltages(values: number[]): number[] {
  const unique: number[] = [];

  for (const value of values) {
    if (
      !unique.some(
        (existing) =>
          Math.abs(existing - value) < 0.001,
      )
    ) {
      unique.push(value);
    }
  }

  return unique;
}

/**
 * Resolves the Arduino Uno's fixed power rails into circuit-net
 * voltage sources.
 *
 * This is a power-rail layer, not a general analog solver:
 *
 *   5V    -> +5.0 V
 *   3.3V  -> +3.3 V
 *   IOREF -> +5.0 V
 *   GND*  -> 0 V
 *
 * Digital output HIGH is also treated as a +5 V source.
 *
 * VIN is deliberately not a source because it is a board power
 * input on a real Uno, not a regulated output rail.
 */
export class PowerRailSolver {
  solve(
    netlist: Netlist,
    powerDrivers: ArduinoPowerDriver[],
    digitalDrivers: ArduinoDigitalDriver[],
    nodes: Node[] = [],
  ): PowerRailState {
    const netValues = new Map<string, number[]>();
    const sourceNets = new Map<string, number>();
    const groundNets = new Set<string>();
    const conflicts: string[] = [];
    const pinVoltages: Record<
      string,
      number | undefined
    > = {};

    for (const driver of powerDrivers) {
      const netId = findPinNet(
        netlist,
        driver.pin,
      );

      if (!netId) {
        continue;
      }

      addVoltage(
        netValues,
        netId,
        driver.voltage,
      );

      if (driver.kind === "ground") {
        groundNets.add(netId);
      } else {
        sourceNets.set(
          netId,
          driver.voltage,
        );
      }

      pinVoltages[driver.pin] =
        driver.voltage;
    }

    /*
     * Digital output HIGH behaves as a 5 V source.
     * LOW is recorded as 0 V for diagnostics, but is not
     * treated as a current source in this phase.
     */
    for (const driver of digitalDrivers) {
      const netId = findPinNet(
        netlist,
        driver.pin,
      );

      if (!netId) {
        continue;
      }

      const voltage =
        driver.level === 1 ? 5 : 0;

      addVoltage(
        netValues,
        netId,
        voltage,
      );

      pinVoltages[driver.pin] =
        voltage;

      if (driver.level === 1) {
        const existing =
          sourceNets.get(netId);

        if (
          existing === undefined ||
          Math.abs(existing - voltage) < 0.001
        ) {
          sourceNets.set(
            netId,
            voltage,
          );
        }
      }
    }

    const netVoltages: Record<
      string,
      number | undefined
    > = {};

    for (const net of netlist.nets) {
      const values =
        netValues.get(net.id) ?? [];

      const unique =
        uniqueVoltages(values);

      if (unique.length > 1) {
        conflicts.push(
          "POWER_CONFLICT:" +
            net.id +
            ":" +
            unique.join(","),
        );

        sourceNets.delete(net.id);
        netVoltages[net.id] =
          undefined;
        continue;
      }

      if (unique.length === 1) {
        netVoltages[net.id] =
          unique[0];
      }
    }

    /*
     * Propagate known net voltage to every pin on that net.
     */
    for (const [
      pinKey,
      netId,
    ] of netlist.pinToNet) {
      const voltage =
        netVoltages[netId];

      if (voltage === undefined) {
        continue;
      }

      pinVoltages[pinKey] =
        voltage;
    }

    /*
     * Board-instance scoping is intentionally deferred until
     * the simulator supports multiple active Arduino runtimes.
     */
    void nodes;

    return {
      netVoltages,
      pinVoltages,
      sourceNets,
      groundNets,
      conflicts,
    };
  }
}

function findPinNet(
  netlist: Netlist,
  pinId: string,
): string | undefined {
  for (const [
    pinKey,
    netId,
  ] of netlist.pinToNet) {
    const separator =
      pinKey.lastIndexOf(":");

    const currentPinId =
      separator >= 0
        ? pinKey.slice(separator + 1)
        : pinKey;

    if (
      currentPinId.toUpperCase() ===
      pinId.toUpperCase()
    ) {
      return netId;
    }
  }

  return undefined;
}
