import type { CircuitPin } from "../types/pin.types";

// =====================================================
// PUSH BUTTON (4-PIN TACTILE SWITCH) PIN DEFINITIONS
// =====================================================

export const pushbuttonPins: CircuitPin[] = [
  {
    id: "1.r",
    label: "1.r",
    alias: "Terminal 1.r",
    type: "terminal",
    direction: "bidirectional",
    description: "Terminal 1.r (Internally connected to Terminal 1B). Pressing the button bridges to Group 2.",
  },
  {
    id: "1.l",
    label: "1.l",
    alias: "Terminal 1.l",
    type: "terminal",
    direction: "bidirectional",
    description: "Terminal 1.l (Internally connected to Terminal 1A). Pressing the button bridges to Group 2.",
  },
  {
    id: "2.r",
    label: "2.r",
    alias: "Terminal 2.r",
    type: "terminal",
    direction: "bidirectional",
    description: "Terminal 2A (Internally connected to Terminal 2B). Pressing the button bridges to Group 1.",
  },
  {
    id: "2.l",
    label: "2.l",
    alias: "Terminal 2.l",
    type: "terminal",
    direction: "bidirectional",
    description: "Terminal 2.l (Internally connected to Terminal 2A). Pressing the button bridges to Group 1.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const pushbuttonPinsById = Object.fromEntries(
  pushbuttonPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;