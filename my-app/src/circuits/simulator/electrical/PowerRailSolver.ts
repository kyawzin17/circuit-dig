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

    /*
     * External 9V battery support.
     *
     * The battery is a real DC source, not just a visual component:
     *   + terminal -> +9V source
     *   - terminal -> 0V reference
     *
     * Only a connected battery participates in the electrical model.
     * This lets circuits such as 9V battery -> resistor -> LED -> GND
     * produce real current/brightness in CurrentFlowSolver.
     */
    for (const node of nodes) {
      const type = String(
        node.data?.componentType ?? node.type ?? "",
      ).toLowerCase();

      if (
        type !== "battery-9v" &&
        type !== "9v-battery" &&
        type !== "battery9v"
      ) {
        continue;
      }

      const positiveNet = findPinNetForNode(
        netlist,
        node.id,
        ["VCC", "9v-b-vcc", "+", "positive"],
      );
      const negativeNet = findPinNetForNode(
        netlist,
        node.id,
        ["GND", "9v-b-gnd", "-", "negative"],
      );

      if (positiveNet) {
        addVoltage(netValues, positiveNet, 9);
        sourceNets.set(positiveNet, 9);
      }

      if (negativeNet) {
        addVoltage(netValues, negativeNet, 0);
        groundNets.add(negativeNet);
      }
    }

    /*
     * Arduino Uno VIN power path.
     *
     * A real Uno accepts an external DC supply on VIN. A 9V battery
     * connected to VIN + GND must therefore feed the board regulator;
     * VIN itself remains ~9V while the board's 5V/3.3V rails remain
     * regulated outputs. The existing fixed rails represent USB/board
     * power, so this path adds the same regulated rails when a battery
     * is actually connected to the Uno VIN pin.
     */
    for (const node of nodes) {
      const type = String(
        node.data?.componentType ?? node.type ?? "",
      ).toLowerCase();

      if (type !== "arduino-uno" && type !== "arduino") {
        continue;
      }

      const vinNet = findPinNetForNode(
        netlist,
        node.id,
        ["VIN"],
      );
      const fiveVNet = findPinNetForNode(
        netlist,
        node.id,
        ["5V"],
      );
      const threeV3Net = findPinNetForNode(
        netlist,
        node.id,
        ["3.3V"],
      );
      const ioRefNet = findPinNetForNode(
        netlist,
        node.id,
        ["IOREF"],
      );
      const groundNet = findPinNetForNode(
        netlist,
        node.id,
        ["GND1", "GND2", "GND3"],
      );

      if (!vinNet) continue;

      const vinVoltage = sourceNets.get(vinNet);
      const vinHasGroundReference =
        groundNet ? groundNets.has(groundNet) : false;

      // Arduino Uno's recommended VIN input range starts above the
      // regulated 5V rail. Do not treat a 5V/3.3V source as VIN power.
      const vinPowered =
        vinVoltage !== undefined &&
        vinVoltage >= 7 &&
        vinVoltage <= 12 &&
        vinHasGroundReference;

      if (!vinPowered) continue;

      if (fiveVNet) {
        addVoltage(netValues, fiveVNet, 5);
        sourceNets.set(fiveVNet, 5);
      }

      if (threeV3Net) {
        addVoltage(netValues, threeV3Net, 3.3);
        sourceNets.set(threeV3Net, 3.3);
      }

      if (ioRefNet) {
        addVoltage(netValues, ioRefNet, 5);
        sourceNets.set(ioRefNet, 5);
      }

      if (groundNet) {
        groundNets.add(groundNet);
      }
    }

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

      /*
       * PWM is still a 5V GPIO output electrically. Its duty cycle
       * controls how long the pin is HIGH, not the DC rail voltage.
       *
       * Arduino's analogWrite() can leave the PORT bit LOW while
       * the timer drives the pin through COMnx, so checking only
       * driver.level would incorrectly turn a PWM output into 0V.
       */
      const isPwmActive =
        driver.pwmDuty !== undefined &&
        driver.pwmDuty > 0;

      const voltage =
        driver.pwmDuty !== undefined
          ? driver.pwmDuty >= 1
            ? 5
            : 5
          : driver.level === 1
            ? 5
            : 0;

      addVoltage(
        netValues,
        netId,
        voltage,
      );

      pinVoltages[driver.pin] =
        voltage;

      if (driver.level === 1 || isPwmActive) {
        const existing =
          sourceNets.get(netId);

        if (
          existing === undefined ||
          Math.abs(existing - 5) < 0.001
        ) {
          sourceNets.set(
            netId,
            5,
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

function findPinNetForNode(
  netlist: Netlist,
  nodeId: string,
  pinIds: string[],
): string | undefined {
  const wanted = new Set(
    pinIds.map((pin) => pin.toUpperCase()),
  );

  for (const [pinKey, netId] of netlist.pinToNet) {
    const separator = pinKey.indexOf(":");
    if (separator < 0) continue;

    const currentNodeId = pinKey.slice(0, separator);
    if (currentNodeId !== nodeId) continue;

    const currentPinId = pinKey.slice(separator + 1).toUpperCase();
    if (wanted.has(currentPinId)) {
      return netId;
    }
  }

  return undefined;
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
