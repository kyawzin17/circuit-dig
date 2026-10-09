import type { Node } from "reactflow";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";
import type { Netlist } from "../circuit/NetlistBuilder";
import type { PowerRailState } from "./PowerRailSolver";
import { parseResistanceOhms } from "./ResistorModel";
import { solveElectricalNetwork, type ElectricalBranch } from "./ResistorNetworkSolver";

export interface WireFlowState {
  isActive: boolean;
  currentMa?: number;
  netId?: string;
}

export interface CurrentFlowState {
  wireStates: Record<string, WireFlowState>;
  activeNets: Set<string>;
  activeComponents: Set<string>;
  componentBrightness: Record<string, number>;
  componentCurrentMa: Record<string, number>;
  componentVoltageDrop: Record<string, number>;
  componentPowerMw: Record<string, number>;
  currentMa?: number;
  sourceVoltage?: number;
  voltageDrop?: number;
  conflicts: string[];
}

type ComponentEdge = {
  componentId: string;
  componentType: string;
  fromNet: string;
  toNet: string;
  resistanceOhm: number;
  voltageDrop: number;
};

const DEFAULT_LED_FORWARD_VOLTAGE = 2;

function normalizeType(node: Node): string {
  return String(
    node.data?.componentType ??
      node.type ??
      "",
  ).toLowerCase();
}

function isGroundPin(pinId: string): boolean {
  return /^GND(?:\d+)?$/i.test(pinId.trim());
}

function findSinkNets(
  netlist: Netlist,
  drivers: ArduinoDigitalDriver[],
  powerState?: PowerRailState,
): Set<string> {
  const sinkNets = findGroundNets(netlist, powerState);

  // An Arduino OUTPUT LOW is an electrical sink for current.
  // This is essential for common-anode 7-segment displays:
  // 5V/common -> segment -> resistor -> GPIO LOW.
  for (const driver of drivers) {
    if (driver.level !== 0) {
      continue;
    }

    for (const [netId, pins] of netlist.netToPins) {
      if (
        pins.some(
          (pin) =>
            pin.pinId.toUpperCase() ===
            driver.pin.toUpperCase(),
        )
      ) {
        sinkNets.add(netId);
      }
    }
  }

  return sinkNets;
}

function findGroundNets(
  netlist: Netlist,
  powerState?: PowerRailState,
): Set<string> {
  if (powerState) {
    return new Set(powerState.groundNets);
  }

  const groundNets = new Set<string>();

  for (const [netId, pins] of netlist.netToPins) {
    if (
      pins.some((pin) =>
        isGroundPin(pin.pinId),
      )
    ) {
      groundNets.add(netId);
    }
  }

  return groundNets;
}

function findSourceNets(
  netlist: Netlist,
  drivers: ArduinoDigitalDriver[],
  powerState?: PowerRailState,
): Map<string, number> {
  const sourceNets = new Map<string, number>();

  if (powerState) {
    for (const [
      netId,
      voltage,
    ] of powerState.sourceNets) {
      sourceNets.set(
        netId,
        voltage,
      );
    }
  }

  for (const driver of drivers) {
    /*
     * PWM is a real HIGH/LOW waveform. The runtime exposes its current
     * timer phase through driver.level, so only the HIGH phase is a
     * source and the LOW phase is a sink.
     */
    if (driver.level !== 1) {
      continue;
    }

    for (const [netId, pins] of netlist.netToPins) {
      if (
        pins.some(
          (pin) =>
            pin.pinId.toUpperCase() ===
            driver.pin.toUpperCase(),
        )
      ) {
        sourceNets.set(netId, 5);
      }
    }
  }

  return sourceNets;
}

function buildComponentEdges(
  nodes: Node[],
  netlist: Netlist,
  drivers: ArduinoDigitalDriver[],
  powerState?: PowerRailState,
): ComponentEdge[] {
  const nodeById = new Map(
    nodes.map((node) => [node.id, node]),
  );

  const edges: ComponentEdge[] = [];

  for (const component of netlist.components) {
    const node = nodeById.get(component.id);

    if (!node) {
      continue;
    }

    const type = normalizeType(node);

    if (type === "resistor") {
      const fromNet = component.terminals.pin1;
      const toNet = component.terminals.pin2;

      if (!fromNet || !toNet) {
        continue;
      }

      const resistance = parseResistanceOhms(
        node.data?.props &&
          typeof node.data.props === "object"
          ? (node.data.props as Record<string, unknown>).value
          : undefined,
      );

      // Invalid values are treated as an open component, not silently
      // replaced with 1kΩ. This avoids reporting physically false current.
      if (resistance === undefined) {
        continue;
      }

      edges.push({
        componentId: node.id,
        componentType: "resistor",
        fromNet,
        toNet,
        resistanceOhm: resistance,
        voltageDrop: 0,
      });

      edges.push({
        componentId: node.id,
        componentType: "resistor",
        fromNet: toNet,
        toNet: fromNet,
        resistanceOhm: resistance,
        voltageDrop: 0,
      });

      continue;
    }

    if (type.includes("led")) {
      const anodeNet = component.terminals.anode;
      const cathodeNet = component.terminals.cathode;

      if (!anodeNet || !cathodeNet) {
        continue;
      }

      /*
       * LED is directional:
       *
       *   Anode -> Cathode
       *
       * It must NOT be treated as a bidirectional wire.
       */
      edges.push({
        componentId: node.id,
        componentType: "led",
        fromNet: anodeNet,
        toNet: cathodeNet,
        resistanceOhm: 0,
        voltageDrop: DEFAULT_LED_FORWARD_VOLTAGE,
      });

      continue;
    }

    if (type === "diode" || type.includes("diode")) {
      const anodeNet = component.terminals.anode;
      const cathodeNet = component.terminals.cathode;
      if (anodeNet && cathodeNet) {
        edges.push({
          componentId: node.id,
          componentType: "diode",
          fromNet: anodeNet,
          toNet: cathodeNet,
          resistanceOhm: 10,
          voltageDrop: 0.7,
        });
      }
      continue;
    }

    if (type === "buzzer") {
      const positive =
        component.terminals.positive ??
        component.terminals["2"];
      const negative =
        component.terminals.negative ??
        component.terminals["1"];
      if (positive && negative) {
        edges.push({
          componentId: node.id,
          componentType: "buzzer",
          fromNet: positive,
          toNet: negative,
          resistanceOhm: 100,
          voltageDrop: 0,
        });
        edges.push({
          componentId: node.id,
          componentType: "buzzer",
          fromNet: negative,
          toNet: positive,
          resistanceOhm: 100,
          voltageDrop: 0,
        });
      }
      continue;
    }

    if (type === "servo") {
      const vcc = component.terminals["V+"];
      const gnd = component.terminals.GND;
      if (vcc && gnd) {
        edges.push({
          componentId: node.id,
          componentType: "servo",
          fromNet: vcc,
          toNet: gnd,
          resistanceOhm: 250,
          voltageDrop: 0,
        });
        edges.push({
          componentId: node.id,
          componentType: "servo",
          fromNet: gnd,
          toNet: vcc,
          resistanceOhm: 250,
          voltageDrop: 0,
        });
      }
      continue;
    }

    if (type === "neopixel") {
      const vdd = component.terminals.VDD;
      const vss = component.terminals.VSS;

      /*
       * WS2812B integrates its RGB constant-current drivers, so the
       * simulator does not invent an external resistor. A full-white
       * pixel is modeled as a conservative ~48mA load (3 x 16mA)
       * using an equivalent resistance at 5V.
       */
      if (vdd && vss) {
        const equivalentResistanceOhm = 5 / 0.048;

        edges.push({
          componentId: node.id,
          componentType: "neopixel",
          fromNet: vdd,
          toNet: vss,
          resistanceOhm: equivalentResistanceOhm,
          voltageDrop: 0,
        });
        edges.push({
          componentId: node.id,
          componentType: "neopixel",
          fromNet: vss,
          toNet: vdd,
          resistanceOhm: equivalentResistanceOhm,
          voltageDrop: 0,
        });
      }
      continue;
    }

    if (type === "rgb-led") {
      const common = component.terminals.COM;
      if (common) {
        for (const colorPin of ["R", "G", "B"]) {
          const pinNet = component.terminals[colorPin];
          if (!pinNet) continue;
          edges.push({
            componentId: node.id,
            componentType: "rgb-led",
            fromNet: pinNet,
            toNet: common,
            resistanceOhm: 80,
            voltageDrop: 2,
          });
        }
      }
      continue;
    }

    if (type === "transistor" || type === "npn") {
      const collector = component.terminals.C;
      const base = component.terminals.B;
      const emitter = component.terminals.E;
      if (collector && emitter) {
        let enabled = false;
        if (base) {
          const basePins = netlist.netToPins.get(base) ?? [];
          enabled = basePins.some((pin) => {
            const driver = drivers.find(
              (candidate: any) => candidate.pin.toUpperCase() === pin.pinId.toUpperCase(),
            );
            return driver?.level === 1 || (driver?.pwmDuty ?? 0) > 0;
          });
        }
        if (enabled) {
          edges.push({
            componentId: node.id,
            componentType: "transistor",
            fromNet: collector,
            toNet: emitter,
            resistanceOhm: 20,
            voltageDrop: 0.1,
          });
          edges.push({
            componentId: node.id,
            componentType: "transistor",
            fromNet: emitter,
            toNet: collector,
            resistanceOhm: 20,
            voltageDrop: 0.1,
          });
        }
      }
      continue;
    }

    if (type === "capacitor" || type === "cap") {
      // A capacitor is open-circuit in the steady-state DC solver.
      // Transient charge/discharge is intentionally handled by a future
      // time-domain model instead of pretending a capacitor is a resistor.
      continue;
    }

    if (
      type === "7segment" ||
      type === "sevensegment" ||
      type === "seven-segment"
    ) {
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

      /*
       * Prefer the real electrical topology over the display attribute
       * when the common pin is clearly connected to GND or a supply.
       * This makes both common-anode and common-cathode wiring work
       * without forcing the user to edit component properties.
       */
      const sourceNets = findSourceNets(
        netlist,
        drivers,
        powerState,
      );
      const sinkNets = findSinkNets(
        netlist,
        drivers,
        powerState,
      );

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

      const commonNames = [
        "COM.1",
        "COM1",
        "COM.2",
        "COM2",
        "COM",
        "DIG1",
        "DIG2",
        "DIG3",
        "DIG4",
      ];

      const commonNets = Array.from(
        new Set(
          commonNames
            .map((name) => component.terminals[name])
            .filter(
              (net): net is string =>
                Boolean(net),
            ),
        ),
      );

      for (const commonNet of commonNets) {
        const common =
          powerState?.groundNets.has(commonNet)
            ? "cathode"
            : sourceNets.has(commonNet)
              ? "anode"
              : configuredCommon;

        /* Only the currently driven common pin participates in the
         * electrical path. This is important for multiplexed displays. */
        const commonEnabled =
          common === "cathode"
            ? sinkNets.has(commonNet)
            : sourceNets.has(commonNet);

        if (!commonEnabled) {
          continue;
        }

        for (const segmentName of segmentNames) {
          const segmentNet =
            component.terminals[segmentName];

          if (!segmentNet) {
            continue;
          }

          const fromNet =
            common === "cathode"
              ? segmentNet
              : commonNet;

          const toNet =
            common === "cathode"
              ? commonNet
              : segmentNet;

          edges.push({
            componentId: node.id,
            componentType: "7segment",
            fromNet,
            toNet,
            resistanceOhm: 0,
            voltageDrop: 2,
          });
        }
      }

      continue;
    }

    if (
      type === "lcd1602" ||
      type === "lcd-1602" ||
      type === "lcd1602-full" ||
      type === "lcd1602-i2c" ||
      type === "lcd1602_i2c" ||
      type === "lcd-i2c"
    ) {
      const vcc =
        component.terminals.VDD ??
        component.terminals.VCC;
      const gnd =
        component.terminals.VSS ??
        component.terminals.GND;

      /*
       * The HD44780 logic is powered by VDD/VSS. The simulator's
       * display protocol is handled separately, but keeping a small
       * equivalent load here makes LCD power visible in the same
       * electrical diagnostics as the other peripherals.
       */
      if (vcc && gnd) {
        edges.push({
          componentId: node.id,
          componentType: "lcd1602",
          fromNet: vcc,
          toNet: gnd,
          resistanceOhm: 1000,
          voltageDrop: 0,
        });
        edges.push({
          componentId: node.id,
          componentType: "lcd1602",
          fromNet: gnd,
          toNet: vcc,
          resistanceOhm: 1000,
          voltageDrop: 0,
        });
      }

      /*
       * Optional LED backlight (A/K on the full 16-pin module).
       */
      const backlightAnode = component.terminals.A;
      const backlightCathode = component.terminals.K;
      if (backlightAnode && backlightCathode) {
        edges.push({
          componentId: node.id,
          componentType: "lcd1602-backlight",
          fromNet: backlightAnode,
          toNet: backlightCathode,
          resistanceOhm: 100,
          voltageDrop: 1.2,
        });
      }

      continue;
    }

    if (
      type === "pushbutton" ||
      type === "button"
    ) {
      const closed =
        node.data?.pressed === true ||
        node.data?.isPressed === true;

      if (!closed) {
        continue;
      }

      const pin1 = component.terminals.pin1;
      const pin2 = component.terminals.pin2;

      if (!pin1 || !pin2) {
        continue;
      }

      edges.push({
        componentId: node.id,
        componentType: type,
        fromNet: pin1,
        toNet: pin2,
        resistanceOhm: 0,
        voltageDrop: 0,
      });

      edges.push({
        componentId: node.id,
        componentType: type,
        fromNet: pin2,
        toNet: pin1,
        resistanceOhm: 0,
        voltageDrop: 0,
      });

      continue;
    }

    if (
      type === "slide-switch" ||
      type === "switch"
    ) {
      const value =
        node.data?.switchValue === 1 ||
        node.data?.on === true ||
        node.data?.isOn === true ||
        node.data?.closed === true
          ? 1
          : 0;

      const common = component.terminals["2"];
      const throwNet =
        component.terminals[value === 1 ? "3" : "1"];

      if (!common || !throwNet) {
        continue;
      }

      edges.push({
        componentId: node.id,
        componentType: type,
        fromNet: common,
        toNet: throwNet,
        resistanceOhm: 0,
        voltageDrop: 0,
      });

      edges.push({
        componentId: node.id,
        componentType: type,
        fromNet: throwNet,
        toNet: common,
        resistanceOhm: 0,
        voltageDrop: 0,
      });
    }
  }

  return edges;
}

function findPathToGround(
  sourceNet: string,
  groundNets: Set<string>,
  adjacency: Map<string, ComponentEdge[]>,
): ComponentEdge[] | null {
  if (groundNets.has(sourceNet)) {
    return [];
  }

  const queue: string[] = [sourceNet];
  const visited = new Set<string>([sourceNet]);

  const previous = new Map<
    string,
    {
      previousNet: string;
      edge: ComponentEdge;
    }
  >();

  while (queue.length > 0) {
    const currentNet = queue.shift()!;

    for (const edge of adjacency.get(currentNet) ?? []) {
      if (visited.has(edge.toNet)) {
        continue;
      }

      visited.add(edge.toNet);
      previous.set(edge.toNet, {
        previousNet: currentNet,
        edge,
      });

      if (groundNets.has(edge.toNet)) {
        const path: ComponentEdge[] = [];
        let cursor = edge.toNet;

        while (cursor !== sourceNet) {
          const step = previous.get(cursor);

          if (!step) {
            return null;
          }

          path.push(step.edge);
          cursor = step.previousNet;
        }

        path.reverse();
        return path;
      }

      queue.push(edge.toNet);
    }
  }

  return null;
}

function solveNetworkForCurrentFlow(
  componentEdges: ComponentEdge[],
  sourceNets: Map<string, number>,
  sinkNets: Set<string>,
) {
  const directedTypes = new Set([
    "led",
    "diode",
    "lcd1602-backlight",
    "7segment",
    "rgb-led",
  ]);
  const branches: ElectricalBranch[] = [];
  const seen = new Set<string>();

  for (const edge of componentEdges) {
    if (!edge.fromNet || !edge.toNet || edge.fromNet === edge.toNet) continue;
    const directed = directedTypes.has(edge.componentType);
    const unorderedNets = [edge.fromNet, edge.toNet].sort();
    const key = directed
      ? [edge.componentId, edge.componentType, edge.fromNet, edge.toNet].join("|")
      : [edge.componentId, edge.componentType, ...unorderedNets].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    branches.push({
      componentId: edge.componentId,
      componentType: edge.componentType,
      fromNet: edge.fromNet,
      toNet: edge.toNet,
      resistanceOhm: edge.resistanceOhm,
      voltageDrop: edge.voltageDrop,
      directed,
    });
  }

  const fixedVoltages = new Map<string, number>();
  for (const net of sinkNets) fixedVoltages.set(net, 0);
  for (const [net, voltage] of sourceNets) {
    // A net cannot simultaneously be an ideal source and a sink.
    if (!sinkNets.has(net)) fixedVoltages.set(net, voltage);
  }

  return solveElectricalNetwork(
    branches,
    fixedVoltages,
    new Set([...sourceNets.keys()].filter((net) => !sinkNets.has(net))),
  );
}

export class CurrentFlowSolver {
  solve(
    nodes: Node[],
    netlist: Netlist,
    drivers: ArduinoDigitalDriver[],
    powerState?: PowerRailState,
  ): CurrentFlowState {
    const wireStates: Record<string, WireFlowState> = {};
    const activeNets = new Set<string>();
    const activeComponents = new Set<string>();
    const componentBrightness: Record<string, number> = {};
    const componentCurrentMa: Record<string, number> = {};
    const componentVoltageDrop: Record<string, number> = {};
    const componentPowerMw: Record<string, number> = {};
    const conflicts: string[] = [];

    const groundNets =
      findGroundNets(
        netlist,
        powerState,
      );

    const sinkNets =
      findSinkNets(
        netlist,
        drivers,
        powerState,
      );

    const sourceNets =
      findSourceNets(
        netlist,
        drivers,
        powerState,
      );

    /*
     * PWM voltage is instantaneous (5V during HIGH, 0V during LOW).
     * We still use duty cycle when reporting average current/brightness,
     * because that is what a real load experiences over many PWM periods.
     */
    const sourceDuties = new Map<string, number>();

    for (const driver of drivers) {
      if (
        driver.pwmDuty === undefined ||
        driver.pwmDuty <= 0
      ) {
        continue;
      }

      const duty = Math.max(
        0,
        Math.min(1, driver.pwmDuty),
      );

      for (const [netId, pins] of netlist.netToPins) {
        if (
          pins.some(
            (pin) =>
              pin.pinId.toUpperCase() ===
              driver.pin.toUpperCase(),
          )
        ) {
          sourceDuties.set(netId, duty);
        }
      }
    }

    if (powerState) {
      conflicts.push(
        ...powerState.conflicts,
      );
    }

    // Surface malformed resistor values to the diagnostics layer.
    for (const node of nodes) {
      if (normalizeType(node) !== "resistor") continue;
      const props =
        node.data?.props && typeof node.data.props === "object"
          ? (node.data.props as Record<string, unknown>)
          : {};
      if (parseResistanceOhms(props.value) === undefined) {
        conflicts.push("INVALID_RESISTANCE:" + node.id);
      }
    }

    const componentEdges =
      buildComponentEdges(
        nodes,
        netlist,
        drivers,
        powerState,
      );

    const adjacency =
      new Map<string, ComponentEdge[]>();

    for (const edge of componentEdges) {
      const list =
        adjacency.get(edge.fromNet) ?? [];

      list.push(edge);
      adjacency.set(edge.fromNet, list);
    }

    let firstCurrentMa: number | undefined;
    let firstVoltageDrop: number | undefined;
    let firstSourceVoltage: number | undefined;

    for (const [
      sourceNet,
      sourceVoltage,
    ] of sourceNets) {
      /*
       * A source net that is already GND is a short
       * circuit, not a normal current-flow path.
       */
      if (groundNets.has(sourceNet)) {
        conflicts.push(
          "SHORT_CIRCUIT:" + sourceNet,
        );
        continue;
      }

      // A HIGH source sharing a net with an OUTPUT LOW is a GPIO conflict,
      // not a valid current path. Do not silently treat that net as GND.
      if (sinkNets.has(sourceNet)) {
        conflicts.push(
          "GPIO_CONFLICT:" + sourceNet,
        );
        continue;
      }

      const path = findPathToGround(
        sourceNet,
        sinkNets,
        adjacency,
      );

      if (!path) {
        continue;
      }

      const pathNets = new Set<string>([
        sourceNet,
      ]);

      let totalResistance = 0;
      let totalVoltageDrop = 0;

      for (const edge of path) {
        pathNets.add(edge.fromNet);
        pathNets.add(edge.toNet);
        activeComponents.add(
          edge.componentId,
        );

        totalResistance +=
          edge.resistanceOhm;

        totalVoltageDrop +=
          edge.voltageDrop;
      }

      for (const netId of pathNets) {
        activeNets.add(netId);
      }

      /*
       * This is intentionally a first-order DC
       * calculation, not a SPICE solver.
       *
       * For a simple Arduino -> resistor -> LED
       * -> GND path:
       *
       *   I = (Vs - Vf) / R
       */
      let pathCurrentMa: number | undefined;

      if (totalResistance > 0) {
        const currentA = Math.max(
          0,
          (sourceVoltage -
            totalVoltageDrop) /
            totalResistance,
        );

        const duty =
          sourceDuties.get(sourceNet) ?? 1;

        pathCurrentMa =
          currentA * 1000 * duty;

        /*
         * Visual LED brightness is intentionally a simple
         * current-based model. 20 mA is treated as the
         * reference "full brightness" point.
         *
         * This is not a photometric LED model; it gives
         * resistor-value changes a visible effect while
         * keeping the electrical solver first-order.
         */
        if (pathCurrentMa !== undefined) {
          for (const edge of path) {
            const previous = componentCurrentMa[edge.componentId];
            componentCurrentMa[edge.componentId] =
              previous === undefined
                ? pathCurrentMa
                : Math.max(previous, pathCurrentMa);
            const actualVoltageDrop =
              edge.componentType === "resistor"
                ? (pathCurrentMa / 1000) * edge.resistanceOhm
                : edge.voltageDrop;
            componentVoltageDrop[edge.componentId] =
              Math.max(componentVoltageDrop[edge.componentId] ?? 0, actualVoltageDrop);

            if (edge.componentType === "led") {
              componentBrightness[
                edge.componentId
              ] = Math.max(
                0,
                Math.min(
                  1,
                  pathCurrentMa / 20,
                ),
              );
            }
          }
        }

        if (
          firstCurrentMa === undefined ||
          pathCurrentMa > firstCurrentMa
        ) {
          firstCurrentMa = pathCurrentMa;
          firstVoltageDrop =
            totalVoltageDrop;
          firstSourceVoltage =
            sourceVoltage;
        }
      }

      /*
       * All wires whose electrical net belongs
       * to the discovered source-to-ground path
       * are energized.
       */
      for (const [
        wireId,
        netId,
      ] of netlist.wireToNet) {
        if (!pathNets.has(netId)) {
          continue;
        }

        wireStates[wireId] = {
          isActive: true,
          currentMa: pathCurrentMa,
          netId,
        };
      }
    }

    /*
     * Every known wire gets an explicit inactive
     * state. This prevents stale animation after
     * a program changes from HIGH to LOW.
     */
    for (const [
      wireId,
      netId,
    ] of netlist.wireToNet) {
      if (wireStates[wireId]) {
        continue;
      }

      wireStates[wireId] = {
        isActive: false,
        netId,
      };
    }

    /*
     * Replace the single-BFS-path estimate with nodal analysis. This solves
     * resistor networks with series/parallel branches together, while the
     * existing UI/state contract remains unchanged.
     */
    const network = solveNetworkForCurrentFlow(
      componentEdges,
      sourceNets,
      sinkNets,
    );

    for (const [componentId, currentMa] of network.branchCurrentMa) {
      componentCurrentMa[componentId] = currentMa;
    }
    for (const [componentId, voltageDrop] of network.branchVoltageDrop) {
      componentVoltageDrop[componentId] = voltageDrop;
    }
    for (const [componentId, powerMw] of network.branchPowerMw) {
      componentPowerMw[componentId] = powerMw;
    }
    for (const edge of componentEdges) {
      if (edge.componentType !== "led") continue;
      const currentMa = network.branchCurrentMa.get(edge.componentId);
      if (currentMa === undefined) continue;
      componentBrightness[edge.componentId] = Math.max(0, Math.min(1, currentMa / 20));
    }
    for (const componentId of network.activeComponents) {
      activeComponents.add(componentId);
    }
    for (const netId of network.activeNets) {
      activeNets.add(netId);
    }

    // Mark wires on solved active nets. Individual wire current depends on
    // junction topology; use the largest adjacent component current as a
    // useful animation estimate, not as a claim of exact wire-branch current.
    for (const [wireId, netId] of netlist.wireToNet) {
      if (network.activeNets.has(netId)) {
        wireStates[wireId] = {
          isActive: true,
          currentMa: Math.max(
            0,
            ...componentEdges
              .filter((edge) => edge.fromNet === netId || edge.toNet === netId)
              .map((edge) => componentCurrentMa[edge.componentId] ?? 0),
          ),
          netId,
        };
      }
    }

    return {
      wireStates,
      activeNets,
      activeComponents,
      componentBrightness,
      componentCurrentMa,
      componentVoltageDrop,
      componentPowerMw,
      currentMa: network.totalSourceCurrentMa > 0
        ? network.totalSourceCurrentMa
        : firstCurrentMa,
      sourceVoltage:
        firstCurrentMa === undefined
          ? undefined
          : firstSourceVoltage,
      voltageDrop: firstVoltageDrop,
      conflicts,
    };
  }
}
