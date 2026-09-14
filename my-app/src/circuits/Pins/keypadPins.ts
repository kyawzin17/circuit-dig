import type { CircuitPin } from "../types/pin.types";

// =====================================================
// 4x4 MATRIX KEYPAD (8-PIN) PIN DEFINITIONS
// =====================================================

export const keypadPins: CircuitPin[] = [
  {
    id: "pin_r1",
    label: "R1",
    alias: "Row 1",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Row 1 (Controls Keys 1, 2, 3, A).",
  },
  {
    id: "pin_r2",
    label: "R2",
    alias: "Row 2",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Row 2 (Controls Keys 4, 5, 6, B).",
  },
  {
    id: "pin_r3",
    label: "R3",
    alias: "Row 3",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Row 3 (Controls Keys 7, 8, 9, C).",
  },
  {
    id: "pin_r4",
    label: "R4",
    alias: "Row 4",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Row 4 (Controls Keys *, 0, #, D).",
  },
  {
    id: "pin_c1",
    label: "C1",
    alias: "Column 1",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Column 1 (Controls Keys 1, 4, 7, *).",
  },
  {
    id: "pin_c2",
    label: "C2",
    alias: "Column 2",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Column 2 (Controls Keys 2, 5, 8, 0).",
  },
  {
    id: "pin_c3",
    label: "C3",
    alias: "Column 3",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Column 3 (Controls Keys 3, 6, 9, #).",
  },
  {
    id: "pin_c4",
    label: "C4",
    alias: "Column 4",
    type: "terminal",
    direction: "passive",
    description: "Keypad Matrix Column 4 (Controls Keys A, B, C, D).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const keypadPinsById = Object.fromEntries(
  keypadPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;