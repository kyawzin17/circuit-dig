import type { CircuitGraph, CircuitPinRef, CircuitNode } from "./CircuitGraph";
import { createPinKey } from "./CircuitGraph";

export type CircuitNet = {
  id: string;
  pins: CircuitPinRef[];
};

export type NetlistComponent = {
  id: string;
  type: string;
  terminals: Record<string, string | null>;
};

export type Netlist = {
  /**
   * Electrical nets are created ONLY by physical wires.
   *
   * A resistor/LED/switch must never merge two nets here.
   * Components are represented separately as elements between nets.
   */
  nets: CircuitNet[];
  pinToNet: Map<string, string>;
  netToPins: Map<string, CircuitPinRef[]>;
  wireToNet: Map<string, string>;
  components: NetlistComponent[];
};

class UnionFind {
  private readonly parent = new Map<string, string>();
  private readonly rank = new Map<string, number>();

  add(value: string): void {
    if (!this.parent.has(value)) {
      this.parent.set(value, value);
      this.rank.set(value, 0);
    }
  }

  find(value: string): string {
    const parent = this.parent.get(value);

    if (!parent) {
      this.add(value);
      return value;
    }

    if (parent === value) {
      return value;
    }

    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);

    if (ra === rb) {
      return;
    }

    const aRank = this.rank.get(ra) ?? 0;
    const bRank = this.rank.get(rb) ?? 0;

    if (aRank < bRank) {
      this.parent.set(ra, rb);
    } else if (aRank > bRank) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, aRank + 1);
    }
  }
}

function normalizeComponentType(node: CircuitNode): string {
  return String(
    node.componentType ??
      node.data?.componentType ??
      node.type ??
      "",
  ).toLowerCase();
}

function getTerminalIds(node: CircuitNode): string[] {
  const type = normalizeComponentType(node);

  if (type === "resistor") {
    return ["pin1", "pin2"];
  }

  if (
    type === "potentiometer" ||
    type === "pot"
  ) {
    return ["VCC", "GND", "SIG"];
  }

  if (type.includes("led")) {
    return ["anode", "cathode"];
  }

  if (
    type === "pushbutton" ||
    type === "button" ||
    type === "slide-switch" ||
    type === "switch"
  ) {
    return ["pin1", "pin2"];
  }

  return [];
}

export class NetlistBuilder {
  build(graph: CircuitGraph): Netlist {
    const uf = new UnionFind();
    const pinRefs = new Map<string, CircuitPinRef>();
    const wireKeys = new Map<
      string,
      { source: string; target: string }
    >();

    const registerPin = (ref: CircuitPinRef): string => {
      const key = createPinKey(ref);
      uf.add(key);
      pinRefs.set(key, ref);
      return key;
    };

    /*
     * IMPORTANT:
     *
     * A wire is the only thing that merges two electrical points
     * into the same net.
     */
    for (const wire of graph.wires) {
      const sourceKey = registerPin(wire.source);
      const targetKey = registerPin(wire.target);

      uf.union(sourceKey, targetKey);

      wireKeys.set(wire.id, {
        source: sourceKey,
        target: targetKey,
      });
    }

    const groups = new Map<string, CircuitPinRef[]>();

    for (const [key, ref] of pinRefs) {
      const root = uf.find(key);
      const pins = groups.get(root) ?? [];
      pins.push(ref);
      groups.set(root, pins);
    }

    const nets: CircuitNet[] = [];
    const pinToNet = new Map<string, string>();
    const netToPins = new Map<string, CircuitPinRef[]>();
    const rootToNet = new Map<string, string>();

    let index = 0;

    for (const [root, pins] of groups) {
      const id = `net-${index++}`;

      rootToNet.set(root, id);
      nets.push({ id, pins });
      netToPins.set(id, pins);

      for (const pin of pins) {
        pinToNet.set(createPinKey(pin), id);
      }
    }

    const wireToNet = new Map<string, string>();

    for (const [wireId, keys] of wireKeys) {
      const root = uf.find(keys.source);
      const netId = rootToNet.get(root);

      if (netId) {
        wireToNet.set(wireId, netId);
      }
    }

    /*
     * Components are NOT electrically collapsed into nets.
     *
     * Example:
     *
     *   D13 --- R.pin1 | RESISTOR | R.pin2 --- LED.A
     *
     * becomes:
     *
     *   net-0 = D13 + R.pin1
     *   net-1 = R.pin2 + LED.A
     *
     * The resistor itself is an element between net-0 and net-1.
     */
    const components: NetlistComponent[] = [];

    for (const node of graph.nodes) {
      const terminalIds = getTerminalIds(node);

      if (terminalIds.length === 0) {
        continue;
      }

      const componentType =
        normalizeComponentType(node);

      const terminals: Record<string, string | null> = {};

      /*
       * Wokwi pushbuttons are four-pin components, not two-pin
       * components. Pins 1.l and 1.r are permanently connected,
       * and pins 2.l and 2.r are permanently connected. The
       * button press connects those two sides.
       *
       * Expose those two physical sides to the electrical solver
       * as logical pin1/pin2 terminals.
       */
      if (
        componentType === "pushbutton" ||
        componentType === "button"
      ) {
        const leftNet =
          pinToNet.get(
            createPinKey({
              nodeId: node.id,
              pinId: "1.l",
            }),
          ) ??
          pinToNet.get(
            createPinKey({
              nodeId: node.id,
              pinId: "1.r",
            }),
          ) ??
          null;

        const rightNet =
          pinToNet.get(
            createPinKey({
              nodeId: node.id,
              pinId: "2.l",
            }),
          ) ??
          pinToNet.get(
            createPinKey({
              nodeId: node.id,
              pinId: "2.r",
            }),
          ) ??
          null;

        terminals.pin1 = leftNet;
        terminals.pin2 = rightNet;
      } else {
        for (const pinId of terminalIds) {
          terminals[pinId] =
            pinToNet.get(
              createPinKey({
                nodeId: node.id,
                pinId,
              }),
            ) ?? null;
        }
      }

      components.push({
        id: node.id,
        type: componentType,
        terminals,
      });
    }

    const netlist: Netlist = {
      nets,
      pinToNet,
      netToPins,
      wireToNet,
      components,
    };

    console.log("[NETLIST]", {
      nets,
      pinToNet,
      wireToNet,
      components,
    });

    return netlist;
  }
}
