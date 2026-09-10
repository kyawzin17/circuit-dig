import type { CircuitPin } from "../types/pin.types";

// =====================================================
// LCD 1602 (PARALLEL INTERFACE) PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID.
//
// React Flow Handle IDs must be exactly the same:
//
// VSS -> Handle vss
// VDD -> Handle vdd
// V0  -> Handle v0
// RS  -> Handle rs
// RW  -> Handle rw
// E   -> Handle e
// D0..D7 -> Handle d0..d7
// A   -> Handle a
// K   -> Handle k
//
// Standard 1602 LCD module uses a 16-pin parallel interface.
// It can operate in either 8-bit mode (D0-D7) or 4-bit mode (D4-D7).
//
// =====================================================

export const lcd1602Pins: CircuitPin[] = [
  // =====================================================
  // POWER & CONTRAST (PINS 1-3)
  // =====================================================

  {
    id: "vss",
    label: "VSS",
    alias: "Ground (0V)",
    type: "terminal",
    direction: "passive",
    description:
      "Ground reference terminal (0V). Connects to circuit ground.",
  },
  {
    id: "vdd",
    label: "VDD",
    alias: "Power (+5V)",
    type: "terminal",
    direction: "passive",
    description:
      "Power supply terminal. Connects to +5V DC power source.",
  },
  {
    id: "v0",
    label: "V0",
    alias: "Contrast Adjust",
    type: "terminal",
    direction: "passive",
    description:
      "Display contrast adjustment pin. Typically connected to the wiper pin of a 10k potentiometer.",
  },

  // =====================================================
  // CONTROL PINS (PINS 4-6)
  // =====================================================

  {
    id: "rs",
    label: "RS",
    alias: "Register Select",
    type: "terminal",
    direction: "passive",
    description:
      "Register Select signal. LOW selects Command Register; HIGH selects Data Register.",
  },
  {
    id: "rw",
    label: "R/W",
    alias: "Read / Write",
    type: "terminal",
    direction: "passive",
    description:
      "Read/Write control line. LOW for Write mode, HIGH for Read mode (usually connected to GND for Write-only).",
  },
  {
    id: "e",
    label: "E",
    alias: "Enable",
    type: "terminal",
    direction: "passive",
    description:
      "Enable signal pin. Latches the data lines into the LCD controller on a HIGH-to-LOW transition.",
  },

  // =====================================================
  // DATA BUS (PINS 7-14)
  // =====================================================

  {
    id: "d0",
    label: "D0",
    alias: "Data Bit 0",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 0 (used only in 8-bit operation mode).",
  },
  {
    id: "d1",
    label: "D1",
    alias: "Data Bit 1",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 1 (used only in 8-bit operation mode).",
  },
  {
    id: "d2",
    label: "D2",
    alias: "Data Bit 2",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 2 (used only in 8-bit operation mode).",
  },
  {
    id: "d3",
    label: "D3",
    alias: "Data Bit 3",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 3 (used only in 8-bit operation mode).",
  },
  {
    id: "d4",
    label: "D4",
    alias: "Data Bit 4",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 4 (used in both 4-bit and 8-bit modes).",
  },
  {
    id: "d5",
    label: "D5",
    alias: "Data Bit 5",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 5 (used in both 4-bit and 8-bit modes).",
  },
  {
    id: "d6",
    label: "D6",
    alias: "Data Bit 6",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 6 (used in both 4-bit and 8-bit modes).",
  },
  {
    id: "d7",
    label: "D7",
    alias: "Data Bit 7",
    type: "terminal",
    direction: "passive",
    description: "Data bus line 7 (used in both 4-bit and 8-bit modes).",
  },

  // =====================================================
  // BACKLIGHT LED (PINS 15-16)
  // =====================================================

  {
    id: "a",
    label: "A",
    alias: "LED Anode (+)",
    type: "terminal",
    direction: "passive",
    description:
      "Backlight LED positive power terminal (+5V, often through a current-limiting resistor).",
  },
  {
    id: "k",
    label: "K",
    alias: "LED Cathode (-)",
    type: "terminal",
    direction: "passive",
    description:
      "Backlight LED negative power terminal (Connects to GND).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const lcd1602PinsById = Object.fromEntries(
  lcd1602Pins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;