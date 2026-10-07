import type { Connection, Edge, Node } from "reactflow";

export type CircuitValidationSeverity = "error" | "warning";

export type CircuitValidationCode =
  | "MISSING_NODE"
  | "MISSING_PIN"
  | "SELF_CONNECTION"
  | "DUPLICATE_CONNECTION"
  | "POWER_SHORT"
  | "POWER_CONFLICT";

export type CircuitValidation = {
  isValid: boolean;
  severity?: CircuitValidationSeverity;
  code?: CircuitValidationCode;
  message?: string;
};

type PinLike = {
  id?: string;
  label?: string;
  type?: string;
  direction?: string;
  voltage?: {
    nominal?: number;
    min?: number;
    max?: number;
  };
};

type NodeLike = Node & {
  data?: {
    pins?: PinLike[];
    componentType?: string;
  };
};

const normalize = (value: unknown) =>
  String(value ?? "").trim().toUpperCase();

function getPin(node: NodeLike | undefined, pinId: string | null | undefined) {
  if (!node || !pinId) return undefined;

  const pins = Array.isArray(node.data?.pins)
    ? node.data.pins
    : [];

  const wanted = normalize(pinId);

  return pins.find(
    (pin) =>
      normalize(pin.id) === wanted ||
      normalize(pin.label) === wanted,
  );
}

function isGround(pin: PinLike | undefined) {
  return (
    normalize(pin?.type) === "GROUND" ||
    normalize(pin?.label).includes("GND") ||
    normalize(pin?.id).includes("GND")
  );
}

function getNominalVoltage(pin: PinLike | undefined) {
  const value = Number(pin?.voltage?.nominal);
  return Number.isFinite(value) ? value : undefined;
}

function isPower(pin: PinLike | undefined) {
  return normalize(pin?.type) === "POWER";
}

function sameConnection(
  a: Connection,
  b: Edge,
) {
  const aSource = a.source ?? "";
  const aTarget = a.target ?? "";
  const aSourcePin = a.sourceHandle ?? "";
  const aTargetPin = a.targetHandle ?? "";

  return (
    (
      aSource === b.source &&
      aTarget === b.target &&
      aSourcePin === (b.sourceHandle ?? "") &&
      aTargetPin === (b.targetHandle ?? "")
    ) ||
    (
      aSource === b.target &&
      aTarget === b.source &&
      aSourcePin === (b.targetHandle ?? "") &&
      aTargetPin === (b.sourceHandle ?? "")
    )
  );
}

export function validateCircuitConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[],
): CircuitValidation {
  const sourceNode = nodes.find(
    (node) => node.id === connection.source,
  ) as NodeLike | undefined;

  const targetNode = nodes.find(
    (node) => node.id === connection.target,
  ) as NodeLike | undefined;

  if (!sourceNode || !targetNode) {
    return {
      isValid: false,
      severity: "error",
      code: "MISSING_NODE",
      message: "Connection references a component that no longer exists.",
    };
  }

  const sourcePin = getPin(
    sourceNode,
    connection.sourceHandle,
  );

  const targetPin = getPin(
    targetNode,
    connection.targetHandle,
  );

  if (!sourcePin || !targetPin) {
    return {
      isValid: false,
      severity: "error",
      code: "MISSING_PIN",
      message: "This wire is connected to an unknown or missing pin.",
    };
  }

  if (
    connection.source === connection.target &&
    connection.sourceHandle === connection.targetHandle
  ) {
    return {
      isValid: false,
      severity: "error",
      code: "SELF_CONNECTION",
      message: "A pin cannot be connected to itself.",
    };
  }

  if (edges.some((edge) => sameConnection(connection, edge))) {
    return {
      isValid: false,
      severity: "error",
      code: "DUPLICATE_CONNECTION",
      message: "This exact pin-to-pin connection already exists.",
    };
  }

  const sourceGround = isGround(sourcePin);
  const targetGround = isGround(targetPin);
  const sourcePower = isPower(sourcePin);
  const targetPower = isPower(targetPin);

  // Ground and a positive power rail are an obvious short circuit.
  if (
    (sourceGround && targetPower) ||
    (targetGround && sourcePower)
  ) {
    const powerPin = sourcePower ? sourcePin : targetPin;
    const voltage = getNominalVoltage(powerPin);

    if (voltage !== undefined && voltage > 0) {
      return {
        isValid: false,
        severity: "error",
        code: "POWER_SHORT",
        message: `${voltage}V power is connected directly to GND. This creates a short circuit.`,
      };
    }
  }

  // Two different positive power rails should not be directly shorted.
  if (sourcePower && targetPower) {
    const sourceVoltage = getNominalVoltage(sourcePin);
    const targetVoltage = getNominalVoltage(targetPin);

    if (
      sourceVoltage !== undefined &&
      targetVoltage !== undefined &&
      Math.abs(sourceVoltage - targetVoltage) > 0.15
    ) {
      return {
        isValid: false,
        severity: "error",
        code: "POWER_CONFLICT",
        message: `${sourceVoltage}V and ${targetVoltage}V power rails are connected directly.`,
      };
    }
  }

  return {
    isValid: true,
  };
}
