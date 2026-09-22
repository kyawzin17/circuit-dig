import type { Node, Edge } from "reactflow";
import { createPinKey, type CircuitPinRef } from "../circuit/CircuitGraph";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";

export type DigitalCircuitState = {
  pinLevels: Map<string, 0 | 1>;
  conflicts: string[];
};

type EdgeData = {
  sourceNodeId?: string;
  sourcePinId?: string | null;
  targetNodeId?: string;
  targetPinId?: string | null;
};

function ref(nodeId: string, pinId: string): CircuitPinRef {
  return { nodeId, pinId };
}

function componentType(node: Node): string {
  return String(node.data?.componentType ?? node.type ?? "").toLowerCase();
}

function isConductiveComponent(node: Node): boolean {
  const type = componentType(node);
  return type === "resistor" || type === "pushbutton" || type === "button" || type === "slide-switch" || type === "switch";
}

function componentClosed(node: Node): boolean {
  const type = componentType(node);
  if (type === "pushbutton" || type === "button") {
    return node.data?.pressed === true || node.data?.isPressed === true;
  }
  if (type === "slide-switch" || type === "switch") {
    return node.data?.on === true || node.data?.isOn === true || node.data?.closed === true;
  }
  return true;
}

export class DigitalCircuitSolver {
  solve(
    nodes: Node[],
    edges: Edge<EdgeData>[],
    drivers: ArduinoDigitalDriver[],
  ): DigitalCircuitState {
    const adjacency = new Map<string, Set<string>>();

    const connect = (a: string, b: string) => {
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a)!.add(b);
      adjacency.get(b)!.add(a);
    };

    for (const edge of edges) {
      const sourceNodeId = edge.data?.sourceNodeId ?? edge.source;
      const targetNodeId = edge.data?.targetNodeId ?? edge.target;
      const sourcePinId = edge.data?.sourcePinId ?? edge.sourceHandle;
      const targetPinId = edge.data?.targetPinId ?? edge.targetHandle;
      if (!sourceNodeId || !targetNodeId || !sourcePinId || !targetPinId) continue;
      connect(createPinKey(ref(sourceNodeId, sourcePinId)), createPinKey(ref(targetNodeId, targetPinId)));
    }

    for (const node of nodes) {
      if (!isConductiveComponent(node)) {
        continue;
      }

      const type = componentType(node);

      if (type === "resistor") {
        connect(
          createPinKey(ref(node.id, "pin1")),
          createPinKey(ref(node.id, "pin2")),
        );
        continue;
      }

      if (type === "pushbutton" || type === "button") {
        /*
         * Wokwi's 4-pin tactile button has two permanent
         * electrical sides:
         *
         *   1.l <-> 1.r
         *   2.l <-> 2.r
         *
         * Pressing the button additionally connects the two
         * sides:
         *
         *   1.r <-> 2.r
         *
         * The previous implementation looked for nonexistent
         * "pin1"/"pin2" handles, so the button never became
         * conductive in the digital graph.
         */
        connect(
          createPinKey(ref(node.id, "1.l")),
          createPinKey(ref(node.id, "1.r")),
        );

        connect(
          createPinKey(ref(node.id, "2.l")),
          createPinKey(ref(node.id, "2.r")),
        );

        if (componentClosed(node)) {
          connect(
            createPinKey(ref(node.id, "1.r")),
            createPinKey(ref(node.id, "2.r")),
          );
        }

        continue;
      }

      if (
        type === "slide-switch" ||
        type === "switch"
      ) {
        if (componentClosed(node)) {
          connect(
            createPinKey(ref(node.id, "pin1")),
            createPinKey(ref(node.id, "pin2")),
          );
        }
      }
    }

    const pinLevels = new Map<string, 0 | 1>();
    const conflicts: string[] = [];

    const visited = new Set<string>();
    const components = new Map<string, Set<string>>();

    for (const start of adjacency.keys()) {
      if (visited.has(start)) continue;
      const queue = [start];
      const component = new Set<string>();
      visited.add(start);
      while (queue.length) {
        const current = queue.shift()!;
        component.add(current);
        for (const next of adjacency.get(current) ?? []) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      components.set(start, component);
    }

    for (const [root, pins] of components) {
      const levels = new Set<0 | 1>();
      for (const driver of drivers) {
        for (const pin of pins) {
          if (pin.endsWith(`:${driver.pin}`)) levels.add(driver.level);
        }
      }
      if (pinsHasGround(pins)) levels.add(0);
      if (levels.has(0) && levels.has(1)) {
        conflicts.push(root);
        for (const pin of pins) pinLevels.set(pin, 0);
      } else if (levels.size === 1) {
        const level = levels.values().next().value as 0 | 1;
        for (const pin of pins) pinLevels.set(pin, level);
      }
    }

    return { pinLevels, conflicts };
  }

  getPinLevel(state: DigitalCircuitState, nodeId: string, pinId: string): 0 | 1 {
    return state.pinLevels.get(createPinKey({ nodeId, pinId })) ?? 0;
  }
}

function pinsHasGround(pins: Set<string>): boolean {
  for (const pin of pins) {
    const pinId = pin.slice(pin.lastIndexOf(":") + 1);
    if (/^GND(?:\d+)?$/i.test(pinId)) return true;
  }
  return false;
}
