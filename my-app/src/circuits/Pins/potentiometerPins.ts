import type { CircuitPin } from "../types/pin.types";

// =====================================================
// POTENTIOMETER (3-PIN VARIABLE RESISTOR) PIN DEFINITIONS
// =====================================================

export const potentiometerPins: CircuitPin[] = [
  {
    id: "GND",
    label: "GND",
    alias: "Terminal 1 (GND/VCC)",
    type: "terminal",
    direction: "passive",
    description: "First outer terminal. Usually connected to GND or VCC.",
  },
  {
    id: "SIG",
    label: "SIG",
    alias: "Wiper (Signal Output)",
    type: "terminal",
    direction: "passive",
    description: "Center wiper terminal. Delivers variable voltage signal based on knob rotation.",
  },
  {
    id: "VCC",
    label: "VCC",
    alias: "Terminal 2 (VCC/GND)",
    type: "terminal",
    direction: "passive",
    description: "Second outer terminal. Usually connected to VCC or GND.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const potentiometerPinsById = Object.fromEntries(
  potentiometerPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;