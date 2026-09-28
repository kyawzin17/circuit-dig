import type { CircuitPin } from "../types/pin.types";

// =====================================================
// OLED SSD1306 DISPLAY (8-PIN SPI BREAKOUT) PIN DEFINITIONS
// =====================================================
// This component is the 8-pin SPI breakout:
// DATA = MOSI/D1, CLK = SCK/D0, DC = data/command,
// RST = reset, CS = chip-select, 3Vo = regulator output,
// VIN = supply input, GND = ground.
//
// IMPORTANT: DATA/CLK are NOT I2C SDA/SCL on this component.
// =====================================================

export const oledSsd13068PinPins: CircuitPin[] = [
  {
    id: "pin_data",
    label: "Data",
    alias: "SPI MOSI / D1",
    type: "terminal",
    direction: "input",
    protocols: ["spi"],
    description: "SPI serial data input (MOSI/D1). Connect to Arduino UNO D11 for hardware SPI.",
  },
  {
    id: "pin_clk",
    label: "Clk",
    alias: "SPI SCK / D0",
    type: "terminal",
    direction: "input",
    protocols: ["spi"],
    description: "SPI serial clock (SCK/D0). Connect to Arduino UNO D13 for hardware SPI.",
  },
  {
    id: "pin_dc",
    label: "DC",
    alias: "Data / Command Control",
    type: "terminal",
    direction: "input",
    protocols: ["spi"],
    description: "Data/Command control. HIGH = display data, LOW = command.",
  },
  {
    id: "pin_rst",
    label: "Rst",
    alias: "Reset",
    type: "terminal",
    direction: "input",
    description: "Hardware reset input. LOW resets the SSD1306 controller.",
  },
  {
    id: "pin_cs",
    label: "CS",
    alias: "SPI Chip Select",
    type: "terminal",
    direction: "input",
    protocols: ["spi"],
    description: "Active-low SPI chip select. LOW enables this OLED.",
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
    description: "3.3V output from the onboard regulator. Leave unconnected when VIN is supplied.",
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
    description: "Main display supply input. Connect to Arduino UNO 5V or a valid 3-5V rail.",
  },
  {
    id: "pin_gnd",
    label: "GND",
    alias: "Ground",
    type: "ground",
    direction: "input",
    description: "Ground connection.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const oledSsd13068PinPinsById = Object.fromEntries(
  oledSsd13068PinPins.map((pin) => [pin.id, pin]),
) as Record<string, CircuitPin>;
