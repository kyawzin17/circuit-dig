import type { CircuitPin } from "../types/pin.types";

// =====================================================
// SLIDE SWITCH (3-PIN SPDT) PIN DEFINITIONS
// =====================================================

export const slideSwitchPins: CircuitPin[] = [
  {
    id: "pin_1",
    label: "1",
    alias: "Terminal 1",
    type: "terminal",
    direction: "bidirectional",
    description: "First switch terminal. Connected to Common pin (Pin 2) when the slider is switched to the left position.",
  },
  {
    id: "pin_2",
    label: "2",
    alias: "Common (COM)",
    type: "terminal",
    direction: "bidirectional",
    description: "Center common pin (COM). Connects to Pin 1 or Pin 3 depending on the switch position.",
  },
  {
    id: "pin_3",
    label: "3",
    alias: "Terminal 2",
    type: "terminal",
    direction: "bidirectional",
    description: "Second switch terminal. Connected to Common pin (Pin 2) when the slider is switched to the right position.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const slideSwitchPinsById = Object.fromEntries(
  slideSwitchPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;