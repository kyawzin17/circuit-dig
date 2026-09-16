import type { CircuitGraph, CircuitPinRef } from "./CircuitGraph";
import { createPinKey } from "./CircuitGraph";

export type CircuitNet = { id: string; pins: CircuitPinRef[] };

export type Netlist = {
  nets: CircuitNet[];
  pinToNet: Map<string, string>;
  netToPins: Map<string, CircuitPinRef[]>;
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
    if (!parent) { this.add(value); return value; }
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const aRank = this.rank.get(ra) ?? 0;
    const bRank = this.rank.get(rb) ?? 0;
    if (aRank < bRank) this.parent.set(ra, rb);
    else if (aRank > bRank) this.parent.set(rb, ra);
    else { this.parent.set(rb, ra); this.rank.set(ra, aRank + 1); }
  }
}

export class NetlistBuilder {
  build(graph: CircuitGraph): Netlist {
    const uf = new UnionFind();
    const pinRefs = new Map<string, CircuitPinRef>();

    const registerPin = (ref: CircuitPinRef) => {
      const key = createPinKey(ref);
      uf.add(key);
      pinRefs.set(key, ref);
    };

    for (const wire of graph.wires) {
      registerPin(wire.source);
      registerPin(wire.target);
      uf.union(createPinKey(wire.source), createPinKey(wire.target));
    }

    // A resistor is a passive two-terminal component. At the digital
    // abstraction level we treat it as a conducting path. The later analog
    // solver will use its resistance for voltage/current calculations.
    for (const node of graph.nodes) {
      if (node.componentType !== "resistor") continue;
      const pin1 = { nodeId: node.id, pinId: "pin1" };
      const pin2 = { nodeId: node.id, pinId: "pin2" };
      registerPin(pin1);
      registerPin(pin2);
      uf.union(createPinKey(pin1), createPinKey(pin2));
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

    let index = 0;
    for (const pins of groups.values()) {
      const id = `net-${index++}`;
      nets.push({ id, pins });
      netToPins.set(id, pins);
      for (const pin of pins) pinToNet.set(createPinKey(pin), id);
    }

    return { nets, pinToNet, netToPins };
  }
}
