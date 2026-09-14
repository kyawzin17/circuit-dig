import type { CircuitPin } from "../types/pin.types";

// =====================================================
// PIR MOTION SENSOR (HC-SR501) PIN DEFINITIONS
// =====================================================

export const pirPins: CircuitPin[] = [
  {
    id: "pin_vcc",
    label: "VCC",
    alias: "Power Supply (+5V)",
    type: "power",
    direction: "passive",
    description: "Power input pin for the PIR motion sensor (Typically 5V DC).",
  },
  {
    id: "pin_out",
    label: "OUT",
    alias: "Digital Output Signal",
    type: "terminal",
    direction: "passive",
    description: "Digital signal output pin. Outputs HIGH (3.3V) when motion is detected and LOW when idle.",
  },
  {
    id: "pin_gnd",
    label: "GND",
    alias: "Ground",
    type: "ground",
    direction: "passive",
    description: "Ground connection pin.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const pirPinsById = Object.fromEntries(
  pirPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;