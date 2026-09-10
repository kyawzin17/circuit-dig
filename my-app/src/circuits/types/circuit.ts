export interface CircuitPin {
  id: string;
  name: string;
  label: string;

  type:
    | "digital"
    | "analog"
    | "power"
    | "ground"
    | "passive";

  electricalType:
    | "input"
    | "output"
    | "bidirectional";
}

export interface CircuitNode {
  id: string;
  componentType: string;
  name: string;

  pins: CircuitPin[];
}

export interface CircuitWire {
  id: string;

  sourceNodeId: string;
  sourcePinId: string;

  targetNodeId: string;
  targetPinId: string;
}