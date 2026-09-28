import type { CircuitPin } from "../types/pin.types";

// =====================================================
// NEOPIXEL (WS2812B RGB LED) PIN DEFINITIONS
// =====================================================

export const neopixelPins: CircuitPin[] = [
  {
    id: "pin_vdd",
    label: "VDD",
    alias: "Power Supply (5V)",
    type: "power",
    direction: "input",
    voltage: {
      min: 3.5,
      max: 5.3,
      nominal: 5,
      unit: "V",
    },
    description: "WS2812B VDD power supply. Nominal 5V.",
  },
  {
    id: "pin_din",
    label: "DIN",
    alias: "Data In",
    type: "terminal",
    direction: "input",
    protocols: ["ws2812b"],
    description: "Digital data input pin from microcontroller or previous NeoPixel.",
  },
  {
    id: "pin_vss",
    label: "VSS",
    alias: "Ground (VSS)",
    type: "ground",
    direction: "passive",
    description: "Ground connection pin.",
  },
  {
    id: "pin_dout",
    label: "DOUT",
    alias: "Data Out",
    type: "terminal",
    direction: "output",
    protocols: ["ws2812b"],
    description: "Digital data output pin for daisy-chaining to the next NeoPixel.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const neopixelPinsById = Object.fromEntries(
  neopixelPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;