<<<<<<< HEAD
import type {
  CircuitGraph,
  CircuitNet,
  CircuitNode,
  CircuitPinRef,
} from "./CircuitGraph";

import {
  createNetId,
  createPinKey,
} from "./CircuitGraph";

/* =========================================================
   NETLIST
========================================================= */

export interface Netlist {
  nodes: CircuitNode[];

  nets: CircuitNet[];

  pinToNet: Map<string, string>;

  netToPins: Map<string, CircuitPinRef[]>;
}

/* =========================================================
   UNION FIND
========================================================= */

class UnionFind {
  private readonly parent =
    new Map<string, string>();

  private readonly rank =
    new Map<string, number>();

  add(value: string): void {
    if (this.parent.has(value)) {
      return;
    }

    this.parent.set(value, value);
    this.rank.set(value, 0);
  }

  find(value: string): string {
    const parent =
      this.parent.get(value);

    if (!parent) {
      this.add(value);
      return value;
    }

    if (parent === value) {
      return value;
    }

    const root =
      this.find(parent);

    this.parent.set(value, root);

    return root;
  }

  union(
    a: string,
    b: string,
  ): void {
    this.add(a);
    this.add(b);

    const rootA =
      this.find(a);

    const rootB =
      this.find(b);

    if (rootA === rootB) {
      return;
    }

    const rankA =
      this.rank.get(rootA) ?? 0;

    const rankB =
      this.rank.get(rootB) ?? 0;

    if (rankA < rankB) {
      this.parent.set(
        rootA,
        rootB,
      );
      return;
    }

    if (rankA > rankB) {
      this.parent.set(
        rootB,
        rootA,
      );
      return;
    }

    this.parent.set(
      rootB,
      rootA,
    );

    this.rank.set(
      rootA,
      rankA + 1,
    );
  }
}

/* =========================================================
   NETLIST BUILDER
========================================================= */

export class NetlistBuilder {
  build(
    graph: CircuitGraph,
  ): Netlist {
    const uf =
      new UnionFind();

    /*
     * Register every connected pin.
     */
    for (const wire of graph.wires) {
      uf.add(
        createPinKey(wire.source),
      );

      uf.add(
        createPinKey(wire.target),
      );

      uf.union(
        createPinKey(wire.source),
        createPinKey(wire.target),
      );
    }

    /*
     * root -> pins
     */
    const groups =
      new Map<
        string,
        CircuitPinRef[]
      >();

    for (const wire of graph.wires) {
      this.addToGroup(
        uf,
        groups,
        wire.source,
      );

      this.addToGroup(
        uf,
        groups,
        wire.target,
      );
    }

    const nets: CircuitNet[] = [];

    const pinToNet =
      new Map<string, string>();

    const netToPins =
      new Map<
        string,
        CircuitPinRef[]
      >();

    let netIndex = 0;

    for (const pins of groups.values()) {
      const netId =
        createNetId(netIndex++);

      const uniquePins =
        this.uniquePins(pins);

      const kind =
        this.detectNetKind(
          uniquePins,
        );

      const net: CircuitNet = {
        id: netId,
        pins: uniquePins,
        kind,
      };

      nets.push(net);

      netToPins.set(
        netId,
        uniquePins,
      );

      for (const pin of uniquePins) {
        pinToNet.set(
          createPinKey(pin),
          netId,
        );
      }
    }

    return {
      nodes: graph.nodes,

      nets,

      pinToNet,

      netToPins,
    };
  }

  /* =======================================================
     GROUP
  ======================================================= */

  private addToGroup(
    uf: UnionFind,
    groups: Map<
      string,
      CircuitPinRef[]
    >,
    pin: CircuitPinRef,
  ): void {
    const key =
      createPinKey(pin);

    const root =
      uf.find(key);

    const existing =
      groups.get(root);

    if (existing) {
      existing.push(pin);
    } else {
      groups.set(
        root,
        [pin],
      );
    }
  }

  /* =======================================================
     UNIQUE
  ======================================================= */

  private uniquePins(
    pins: CircuitPinRef[],
  ): CircuitPinRef[] {
    const seen =
      new Set<string>();

    const result: CircuitPinRef[] = [];

    for (const pin of pins) {
      const key =
        createPinKey(pin);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(pin);
    }

    return result;
  }

  /* =======================================================
     NET KIND
  ======================================================= */

  private detectNetKind(
    pins: CircuitPinRef[],
  ): CircuitNet["kind"] {
    for (const pin of pins) {
      const normalized =
        pin.pinId
          .toLowerCase()
          .replace(/[\s_-]/g, "");

      if (
        normalized === "gnd" ||
        normalized === "ground" ||
        normalized === "powergnd"
      ) {
        return "gnd";
      }

      if (
        normalized === "vcc" ||
        normalized === "5v" ||
        normalized === "3v3" ||
        normalized === "power5v"
      ) {
        return "vcc";
      }

      if (
        normalized.startsWith("digital")
      ) {
        return "digital";
      }

      if (
        normalized.startsWith("analog")
      ) {
        return "analog";
      }
    }

    return "unknown";
  }
}
=======
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
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
