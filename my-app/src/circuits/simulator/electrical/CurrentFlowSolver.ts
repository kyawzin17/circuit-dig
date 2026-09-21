import type { Node } from "reactflow";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";
import type { Netlist } from "../circuit/NetlistBuilder";
import type { PowerRailState } from "./PowerRailSolver";

export interface WireFlowState {
  isActive: boolean;
  currentMa?: number;
  netId?: string;
}

export interface CurrentFlowState {
  wireStates: Record<string, WireFlowState>;
  activeNets: Set<string>;
  activeComponents: Set<string>;
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

function parseResistance(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0
      ? value
      : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/Ω/gi, "")
    .replace(/ohm/gi, "");

  if (!normalized) {
    return 0;
  }

  const match = normalized.match(
    /^([0-9]*\.?[0-9]+)([kmgt]?)(?:Ω|ohm)?$/i,
  );

  if (!match) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : 0;
  }

  const base = Number(match[1]);

  if (!Number.isFinite(base) || base <= 0) {
    return 0;
  }

  const suffix = match[2].toLowerCase();

  const multiplier =
    suffix === "k"
      ? 1_000
      : suffix === "m"
        ? 1_000_000
        : suffix === "g"
          ? 1_000_000_000
          : suffix === "t"
            ? 1_000_000_000_000
            : 1;

  return base * multiplier;
}

function isGroundPin(pinId: string): boolean {
  return /^GND(?:\d+)?$/i.test(pinId.trim());
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

      const resistance =
        parseResistance(
          node.data?.props &&
            typeof node.data.props === "object"
            ? (node.data.props as Record<string, unknown>).value
            : undefined,
        ) || 1000;

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

    if (
      type === "pushbutton" ||
      type === "button" ||
      type === "slide-switch" ||
      type === "switch"
    ) {
      const closed =
        node.data?.pressed === true ||
        node.data?.isPressed === true ||
        node.data?.on === true ||
        node.data?.isOn === true ||
        node.data?.closed === true;

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
    const conflicts: string[] = [];

    const groundNets =
      findGroundNets(
        netlist,
        powerState,
      );

    const sourceNets =
      findSourceNets(
        netlist,
        drivers,
        powerState,
      );

    if (powerState) {
      conflicts.push(
        ...powerState.conflicts,
      );
    }

    const componentEdges =
      buildComponentEdges(
        nodes,
        netlist,
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

      const path = findPathToGround(
        sourceNet,
        groundNets,
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
          (DEFAULT_SOURCE_VOLTAGE -
            totalVoltageDrop) /
            totalResistance,
        );

        pathCurrentMa =
          currentA * 1000;

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

    return {
      wireStates,
      activeNets,
      activeComponents,
      currentMa: firstCurrentMa,
      sourceVoltage:
        firstCurrentMa === undefined
          ? undefined
          : firstSourceVoltage,
      voltageDrop: firstVoltageDrop,
      conflicts,
    };
  }
}
