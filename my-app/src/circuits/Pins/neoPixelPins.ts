import type { CircuitPin } from "../types/pin.types";

// =====================================================
// NEOPIXEL (WS2812B RGB LED) PIN DEFINITIONS
// =====================================================

export const neopixelPins: CircuitPin[] = [
  {
    id: "pin_vcc",
    label: "VCC",
    alias: "Power Supply (+5V)",
    type: "power",
    direction: "passive",
    description: "Power supply pin for NeoPixel (Typically +5V DC).",
  },
  {
    id: "pin_din",
    label: "DIN",
    alias: "Data In",
    type: "terminal",
    direction: "passive",
    description: "Digital data input pin from microcontroller or previous NeoPixel.",
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
    id: "pin_dout",
    label: "DOUT",
    alias: "Data Out",
    type: "terminal",
    direction: "passive",
    description: "Digital data output pin for daisy-chaining to the next NeoPixel.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const neopixelPinsById = Object.fromEntries(
  neopixelPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;