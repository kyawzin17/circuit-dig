import type { Edge, Node } from "reactflow";

/* =========================================================
   CIRCUIT GRAPH TYPES
========================================================= */

export interface CircuitPinRef {
  nodeId: string;
  pinId: string;
}

export interface CircuitNode {
  id: string;
  type: string;
  componentType?: string;
  label?: string;
  props?: Record<string, unknown>;
}

export interface CircuitWire {
  id: string;

  source: CircuitPinRef;
  target: CircuitPinRef;

  points?: unknown;
}

export interface CircuitNet {
  id: string;

  pins: CircuitPinRef[];

  /**
   * Optional semantic information.
   *
   * Examples:
   * - GND
   * - VCC
   * - DIGITAL
   * - ANALOG
   */
  kind?: "gnd" | "vcc" | "digital" | "analog" | "unknown";
}

export interface CircuitGraph {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  nets: CircuitNet[];
}

/* =========================================================
   REACT FLOW ADAPTER TYPES
========================================================= */

export type CircuitReactFlowNode = Node<{
  componentType?: string;
  label?: string;
  props?: Record<string, unknown>;
  [key: string]: unknown;
}>;

export interface CircuitEdgeData {
  points?: unknown;

  sourceNodeId?: string;
  sourcePinId?: string | null;

  targetNodeId?: string;
  targetPinId?: string | null;

  [key: string]: unknown;
}

/* =========================================================
   HELPERS
========================================================= */

export function normalizePinId(
  pinId: string | null | undefined,
): string | null {
  if (!pinId) {
    return null;
  }

  return pinId.trim();
}

export function createPinKey(
  pin: CircuitPinRef,
): string {
  return `${pin.nodeId}:${pin.pinId}`;
}

export function createNetId(
  index: number,
): string {
  return `net-${index}`;
}

/* =========================================================
   GRAPH BUILDER
========================================================= */

export function createCircuitGraph(
  nodes: CircuitReactFlowNode[],
  edges: Edge<CircuitEdgeData>[],
): CircuitGraph {
  const circuitNodes: CircuitNode[] =
    nodes.map((node) => ({
      id: node.id,
      type: node.type ?? "unknown",
      componentType:
        node.data?.componentType,
      label:
        node.data?.label,
      props:
        node.data?.props,
    }));

  const wires: CircuitWire[] = [];

  for (const edge of edges) {
    const sourceNodeId =
      edge.data?.sourceNodeId ??
      edge.source;

    const targetNodeId =
      edge.data?.targetNodeId ??
      edge.target;

    const sourcePinId =
      normalizePinId(
        edge.data?.sourcePinId ??
        edge.sourceHandle,
      );

    const targetPinId =
      normalizePinId(
        edge.data?.targetPinId ??
        edge.targetHandle,
      );

    if (
      !sourceNodeId ||
      !targetNodeId ||
      !sourcePinId ||
      !targetPinId
    ) {
      continue;
    }

    wires.push({
      id: edge.id,

      source: {
        nodeId: sourceNodeId,
        pinId: sourcePinId,
      },

      target: {
        nodeId: targetNodeId,
        pinId: targetPinId,
      },

      points: edge.data?.points,
    });
  }

  return {
    nodes: circuitNodes,
    wires,
    nets: [],
  };
}