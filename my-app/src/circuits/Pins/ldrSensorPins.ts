import type { CircuitPin } from "../types/pin.types";

// =====================================================
// LDR SENSOR MODULE (3/4-PIN) PIN DEFINITIONS
// =====================================================

export const ldrModulePins: CircuitPin[] = [
  {
    id: "pin_vcc",
    label: "VCC",
    alias: "Power Supply (+3.3V/5V)",
    type: "power",
    direction: "passive",
    description: "Power supply input (3.3V - 5V DC).",
  },
  {
    id: "pin_gnd",
    label: "GND",
    alias: "Ground",
    type: "ground",
    direction: "passive",
    description: "Ground connection pin.",
  },
  {
    id: "pin_do",
    label: "D0",
    alias: "Digital Output",
    type: "terminal",
    direction: "passive",
    description: "Digital output pin (HIGH/LOW signal based on threshold setting).",
  },
  {
    id: "pin_ao",
    label: "A0",
    alias: "Analog Output",
    type: "terminal",
    direction: "passive",
    description: "Analog output pin (Real-time voltage output based on light intensity).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const ldrModulePinsById = Object.fromEntries(
  ldrModulePins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;