import type { CircuitGraph, CircuitPinRef } from "./CircuitGraph";
import { createPinKey } from "./CircuitGraph";

export type CircuitNet = {
  id: string;
  pins: CircuitPinRef[];
};

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
    if (!parent) {
      this.add(value);
      return value;
    }
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA) ?? 0;
    const rankB = this.rank.get(rootB) ?? 0;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
}

export class NetlistBuilder {
  build(graph: CircuitGraph): Netlist {
    const uf = new UnionFind();
    const pinRefs = new Map<string, CircuitPinRef>();

    for (const wire of graph.wires) {
      const sourceKey = createPinKey(wire.source);
      const targetKey = createPinKey(wire.target);
      uf.add(sourceKey);
      uf.add(targetKey);
      pinRefs.set(sourceKey, wire.source);
      pinRefs.set(targetKey, wire.target);
      uf.union(sourceKey, targetKey);
    }

    const groups = new Map<string, CircuitPinRef[]>();

    for (const [key, ref] of pinRefs) {
      const root = uf.find(key);
      const group = groups.get(root) ?? [];
      group.push(ref);
      groups.set(root, group);
    }

    const nets: CircuitNet[] = [];
    const pinToNet = new Map<string, string>();
    const netToPins = new Map<string, CircuitPinRef[]>();

    let index = 0;
    for (const pins of groups.values()) {
      const id = `net-${index++}`;
      nets.push({ id, pins });
      netToPins.set(id, pins);
      for (const pin of pins) {
        pinToNet.set(createPinKey(pin), id);
      }
    }

    return { nets, pinToNet, netToPins };
  }
}
