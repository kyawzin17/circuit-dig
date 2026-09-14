import type { CircuitPin } from "../types/pin.types";

// =====================================================
// OLED SSD1306 DISPLAY (7-PIN SPI) PIN DEFINITIONS
// =====================================================

export const oledSsd1306SpiPins: CircuitPin[] = [
  {
    id: "pin_gnd",
    label: "GND",
    alias: "Ground",
    type: "ground",
    direction: "passive",
    description: "Ground connection pin.",
  },
  {
    id: "pin_vcc",
    label: "VCC",
    alias: "Power Supply (3.3V - 5V)",
    type: "power",
    direction: "passive",
    description: "Power supply pin for OLED display (Typically 3.3V or 5V DC).",
  },
  {
    id: "pin_d0",
    label: "D0",
    alias: "SPI Clock (SCLK / CLK)",
    type: "terminal",
    direction: "passive",
    description: "SPI serial clock line.",
  },
  {
    id: "pin_d1",
    label: "D1",
    alias: "SPI Data (MOSI / SDIN)",
    type: "terminal",
    direction: "passive",
    description: "SPI Master Out Slave In serial data line.",
  },
  {
    id: "pin_res",
    label: "RES",
    alias: "Reset (RST)",
    type: "terminal",
    direction: "passive",
    description: "Hardware reset pin. Bring LOW to reset the display controller.",
  },
  {
    id: "pin_dc",
    label: "DC",
    alias: "Data / Command Control",
    type: "terminal",
    direction: "passive",
    description: "Data/Command pin (HIGH for Data, LOW for Command).",
  },
  {
    id: "pin_cs",
    label: "CS",
    alias: "Chip Select",
    type: "terminal",
    direction: "passive",
    description: "Active-low chip select line to enable communication.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const oledSsd1306SpiPinsById = Object.fromEntries(
  oledSsd1306SpiPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;