import type { Edge, Node } from "reactflow";

import type { CircuitPin } from "./pin.types";

// =====================================================
// COMPONENT TYPES
// =====================================================

export type CircuitComponentType =
  | "arduino-uno"
  | "resistor"
  | "capacitor"
  | "diode"
  | "led"
  | "transistor"
  | "breadboard"
  | "custom";

// =====================================================
// NODE DATA
// =====================================================

/**
 * Data stored inside a React Flow circuit node.
 *
 * Every component placed on the canvas should contain
 * its component information and pin definitions here.
 */
export interface CircuitNodeData {
  /**
   * Component display name.
   *
   * Example:
   * Arduino UNO
   * Resistor
   */
  label: string;

  /**
   * Circuit component type.
   */
  componentType: CircuitComponentType;

  /**
   * Component pins.
   *
   * Pin definitions are the source of truth for
   * the pins belonging to this component.
   */
  pins: CircuitPin[];

  /**
   * Optional component value.
   *
   * Example:
   * 220Ω
   * 10kΩ
   * 100nF
   */
  value?: string;

  /**
   * Optional component category.
   */
  category?: string;

  /**
   * Optional description.
   */
  description?: string;

  /**
   * Allows existing/custom node data
   * without losing type safety for the core fields.
   */
  [key: string]: unknown;
}

// =====================================================
// CIRCUIT NODE
// =====================================================

/**
 * React Flow node used in the circuit editor.
 */
export type CircuitNode = Node<CircuitNodeData>;

// =====================================================
// CIRCUIT WIRE DATA
// =====================================================

/**
 * Metadata stored inside a React Flow edge.
 *
 * This is important because an edge is not just a
 * visual line in the circuit editor.
 *
 * It represents:
 *
 * Node A + Pin A
 *        ↓
 *      Wire
 *        ↓
 * Node B + Pin B
 */
export interface CircuitWireData {
  /**
   * Source node ID.
   */
  sourceNodeId: string;

  /**
   * Source pin ID.
   *
   * Example:
   * D13
   * A0
   * GND1
   * A
   */
  sourcePinId: string;

  /**
   * Target node ID.
   */
  targetNodeId: string;

  /**
   * Target pin ID.
   */
  targetPinId: string;
}

// =====================================================
// CIRCUIT WIRE
// =====================================================

/**
 * React Flow edge representing an electrical connection.
 */
export type CircuitWire = Edge<CircuitWireData>;

// =====================================================
// PIN CONNECTION
// =====================================================

/**
 * A normalized connection object.
 *
 * Used by:
 *
 * - Right Sidebar
 * - Pin status
 * - Circuit validation
 * - Simulation
 */
export interface PinConnection {
  /**
   * React Flow edge ID.
   */
  wireId: string;

  /**
   * Current node.
   */
  nodeId: string;

  /**
   * Current pin.
   */
  pinId: string;

  /**
   * Connected node.
   */
  connectedNodeId: string;

  /**
   * Connected pin.
   */
  connectedPinId: string;
}

// =====================================================
// CONNECTED PIN INFO
// =====================================================

/**
 * Human-readable information used by UI panels.
 */
export interface ConnectedPinInfo {
  wireId: string;

  nodeId: string;

  nodeLabel: string;

  pinId: string;

  pinLabel: string;
}