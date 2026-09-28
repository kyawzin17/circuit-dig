import type { CircuitPin } from "../types/pin.types";

// =====================================================
// OLED SSD1306 DISPLAY (8-PIN BREAKOUT) PIN DEFINITIONS
// =====================================================

export const oledSsd13068PinPins: CircuitPin[] = [
  {
    id: "pin_data",
    label: "Data",
    alias: "I2C SDA",
    type: "terminal",
    direction: "bidirectional",
    protocols: ["i2c"],
    description: "I2C serial data line. Connect to Arduino UNO A4/SDA.",
  },
  {
    id: "pin_clk",
    label: "Clk",
    alias: "I2C SCL",
    type: "terminal",
    direction: "input",
    protocols: ["i2c"],
    description: "I2C serial clock line. Connect to Arduino UNO A5/SCL.",
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
    direction: "output",
    voltage: {
      min: 3.0,
      max: 3.6,
      nominal: 3.3,
      unit: "V",
    },
    description: "3.3V output from the onboard voltage regulator."
  },
  {
    id: "pin_vin",
    label: "VIN",
    alias: "Power Supply Input (3V - 5V)",
    type: "power",
    direction: "input",
    voltage: {
      min: 3.0,
      max: 5.5,
      nominal: 5,
      unit: "V",
    },
    description: "Main power supply input (3V to 5V DC)."
  },
  {
    id: "pin_gnd",
    label: "GND",
    alias: "Ground",
    type: "ground",
    direction: "input",
    description: "Ground connection pin.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const oledSsd13068PinPinsById = Object.fromEntries(
  oledSsd13068PinPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;