import type { Edge, Node } from "reactflow";

export type CircuitPinRef = {
  nodeId: string;
  pinId: string;
};

export type CircuitNode = {
  id: string;
  type: string;
  componentType?: string;
  data: Record<string, unknown>;
};

export type CircuitWire = {
  id: string;
  source: CircuitPinRef;
  target: CircuitPinRef;
};

export type CircuitGraph = {
  nodes: CircuitNode[];
  wires: CircuitWire[];
};

export type CircuitWireSimulation = {
  isActive: boolean;
  currentMa?: number;
  netId?: string;
};

export type CircuitEdgeData = {
  points?: unknown;
  sourceNodeId?: string;
  sourcePinId?: string | null;
  targetNodeId?: string;
  targetPinId?: string | null;
  simulation?: CircuitWireSimulation;
};

export function normalizePinId(
  pinId: string,
): string {
  return pinId.trim();
}

export function createPinKey(
  ref: CircuitPinRef,
): string {
  return (
    ref.nodeId +
    ":" +
    normalizePinId(ref.pinId)
  );
}

export function createCircuitGraph(
  nodes: Node[],
  edges: Edge<CircuitEdgeData>[],
): CircuitGraph {
  const circuitNodes: CircuitNode[] =
    nodes.map((node) => ({
      id: node.id,
      type: node.type ?? "unknown",
      componentType:
        typeof node.data?.componentType ===
        "string"
          ? node.data.componentType
          : undefined,
      data: (node.data ?? {}) as Record<
        string,
        unknown
      >,
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
      edge.data?.sourcePinId ??
      edge.sourceHandle;

    const targetPinId =
      edge.data?.targetPinId ??
      edge.targetHandle;

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
        pinId: normalizePinId(
          sourcePinId,
        ),
      },
      target: {
        nodeId: targetNodeId,
        pinId: normalizePinId(
          targetPinId,
        ),
      },
    });
  }

  return {
    nodes: circuitNodes,
    wires,
  };
}
