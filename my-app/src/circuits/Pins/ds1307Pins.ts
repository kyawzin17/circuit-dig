import type { CircuitPin } from "../types/pin.types";

// =====================================================
// RTC DS1307 MODULE PIN DEFINITIONS
// =====================================================

export const ds1307Pins: CircuitPin[] = [
  {
    id: "pin_sqw",
    label: "SQW",
    alias: "Square Wave Output",
    type: "terminal",
    direction: "passive",
    description: "Programmable square-wave signal output (1Hz, 4.096kHz, 8.192kHz, 32.768kHz).",
  },
  {
    id: "pin_scl",
    label: "SCL",
    alias: "I2C Clock Line",
    type: "terminal",
    direction: "passive",
    description: "I2C serial clock line for synchronization.",
  },
  {
    id: "pin_sda",
    label: "SDA",
    alias: "I2C Data Line",
    type: "terminal",
    direction: "bidirectional",
    description: "I2C serial data line for reading/writing RTC data.",
  },
  {
    id: "pin_vcc",
    label: "VCC",
    alias: "Power Supply (+5V)",
    type: "power",
    direction: "passive",
    description: "Main power supply pin for DS1307 module (Typically 5V DC).",
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

export const ds1307PinsById = Object.fromEntries(
  ds1307Pins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;