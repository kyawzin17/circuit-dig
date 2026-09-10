import { create } from "zustand";

import type {
  CircuitNode,
  CircuitWire,
} from "../circuits/types/circuit";

interface CircuitStore {
  nodes: CircuitNode[];
  wires: CircuitWire[];

  selectedNodeId: string | null;
  selectedPinId: string | null;

  addNode: (node: CircuitNode) => void;

  removeNode: (nodeId: string) => void;

  addWire: (wire: CircuitWire) => void;

  removeWire: (wireId: string) => void;

  selectNode: (nodeId: string | null) => void;

  selectPin: (pinId: string | null) => void;
}

export const useCircuitStore = create<CircuitStore>(
  (set) => ({
    nodes: [],

    wires: [],

    selectedNodeId: null,

    selectedPinId: null,

    // -------------------------
    // Node
    // -------------------------

    addNode: (node) =>
      set((state) => ({
        nodes: [...state.nodes, node],
      })),

    removeNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter(
          (node) => node.id !== nodeId
        ),

        wires: state.wires.filter(
          (wire) =>
            wire.sourceNodeId !== nodeId &&
            wire.targetNodeId !== nodeId
        ),
      })),

    // -------------------------
    // Wire
    // -------------------------

    addWire: (wire) =>
      set((state) => ({
        wires: [...state.wires, wire],
      })),

    removeWire: (wireId) =>
      set((state) => ({
        wires: state.wires.filter(
          (wire) => wire.id !== wireId
        ),
      })),

    // -------------------------
    // Selection
    // -------------------------

    selectNode: (nodeId) =>
      set({
        selectedNodeId: nodeId,
        selectedPinId: null,
      }),

    selectPin: (pinId) =>
      set({
        selectedPinId: pinId,
      }),
  })
);