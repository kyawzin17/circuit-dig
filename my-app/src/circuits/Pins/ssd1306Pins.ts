import type { CircuitPin } from "../types/pin.types";

// =====================================================
// OLED SSD1306 DISPLAY (8-PIN BREAKOUT) PIN DEFINITIONS
// =====================================================

export const oledSsd13068PinPins: CircuitPin[] = [
  {
    id: "pin_data",
    label: "Data",
    alias: "SPI MOSI / I2C SDA",
    type: "terminal",
    direction: "passive",
    description: "Serial data line (MOSI for SPI / SDA for I2C).",
  },
  {
    id: "pin_clk",
    label: "Clk",
    alias: "SPI Clock / I2C SCL",
    type: "terminal",
    direction: "passive",
    description: "Serial clock line (SCK for SPI / SCL for I2C).",
  },
  {
    id: "pin_dc",
    label: "DC",
    alias: "Data / Command Control",
    type: "terminal",
    direction: "passive",
    description: "Data/Command control pin (HIGH for Data, LOW for Command).",
  },
  {
    id: "pin_rst",
    label: "Rst",
    alias: "Reset",
    type: "terminal",
    direction: "passive",
    description: "Hardware reset pin. Bring LOW to reset the display controller.",
  },
  {
    id: "pin_cs",
    label: "CS",
    alias: "Chip Select",
    type: "terminal",
    direction: "passive",
    description: "Active-low chip select pin to enable SPI communication.",
  },
  {
    id: "pin_3vo",
    label: "3Vo",
    alias: "3.3V Power Output",
    type: "power",
    direction: "passive",
    description: "3.3V output from the onboard voltage regulator.",
  },
  {
    id: "pin_vin",
    label: "VIN",
    alias: "Power Supply Input (3V - 5V)",
    type: "power",
    direction: "passive",
    description: "Main power supply input pin (Typically 3.3V or 5V DC).",
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

export const oledSsd13068PinPinsById = Object.fromEntries(
  oledSsd13068PinPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;