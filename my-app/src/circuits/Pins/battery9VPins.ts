import type { CircuitPin } from "../types/pin.types";

// =====================================================
// BATTERY (DC POWER SOURCE - 2 PIN) PIN DEFINITIONS
// =====================================================

export const batteryPins: CircuitPin[] = [
  {
    id: "9v-b-vcc",
    label: "+",
    alias: "Positive Terminal (+)",
    type: "power",
    direction: "passive",
    description: "Positive DC voltage output terminal (+ / VCC).",
  },
  {
    id: "9v-b-gnd",
    label: "-",
    alias: "Negative Terminal (- / GND)",
    type: "ground",
    direction: "passive",
    description: "Negative reference terminal (- / GND).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const batteryPinsById = Object.fromEntries(
  batteryPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;