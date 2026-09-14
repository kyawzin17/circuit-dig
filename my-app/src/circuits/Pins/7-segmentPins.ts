import type { CircuitPin } from "../types/pin.types";

// =====================================================
// 7-SEGMENT DISPLAY (10-PIN) PIN DEFINITIONS
// =====================================================

export const sevenSegmentPins: CircuitPin[] = [
  {
    id: "pin_a",
    label: "A",
    alias: "Segment A",
    type: "terminal",
    direction: "passive",
    description: "Controls top horizontal segment (A).",
  },
  {
    id: "pin_b",
    label: "B",
    alias: "Segment B",
    type: "terminal",
    direction: "passive",
    description: "Controls top-right vertical segment (B).",
  },
  {
    id: "pin_c",
    label: "C",
    alias: "Segment C",
    type: "terminal",
    direction: "passive",
    description: "Controls bottom-right vertical segment (C).",
  },
  {
    id: "pin_d",
    label: "D",
    alias: "Segment D",
    type: "terminal",
    direction: "passive",
    description: "Controls bottom horizontal segment (D).",
  },
  {
    id: "pin_e",
    label: "E",
    alias: "Segment E",
    type: "terminal",
    direction: "passive",
    description: "Controls bottom-left vertical segment (E).",
  },
  {
    id: "pin_f",
    label: "F",
    alias: "Segment F",
    type: "terminal",
    direction: "passive",
    description: "Controls top-left vertical segment (F).",
  },
  {
    id: "pin_g",
    label: "G",
    alias: "Segment G",
    type: "terminal",
    direction: "passive",
    description: "Controls middle horizontal segment (G).",
  },
  {
    id: "pin_dp",
    label: "DP",
    alias: "Decimal Point",
    type: "terminal",
    direction: "passive",
    description: "Controls the decimal point LED.",
  },
  {
    id: "pin_com1",
    label: "COM1",
    alias: "Common Pin 1",
    type: "terminal",
    direction: "passive",
    description: "Common cathode (GND) or common anode (VCC) pin.",
  },
  {
    id: "pin_com2",
    label: "COM2",
    alias: "Common Pin 2",
    type: "terminal",
    direction: "passive",
    description: "Secondary common pin (internally connected to COM1).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const sevenSegmentPinsById = Object.fromEntries(
  sevenSegmentPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;