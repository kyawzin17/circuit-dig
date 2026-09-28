import { digital } from "./pin";

// =====================================================
// OLED SSD1306 DISPLAY (128x64 8-PIN I2C BREAKOUT)
// =====================================================
//
// Pin layout:
//
//   ┌───────────────────────────────────────┐
//   │          OLED SSD1306 8-PIN           │
//   │           [128x64 Display]            │
//   │                                       │
//   │ DATA CLK DC RST CS 3VO VIN GND        │
//   └───────────────────────────────────────┘
//
// =====================================================

export const OLED_SSD1306_8PIN_PIN = [
  {
    name: "DATA",
    x: 36,
    y: 12,
    dir: "top",
    signals: [
      { type: "protocol", signal: "I2C_SDA" },
    ],
  },

  {
    name: "CLK",
    x: 45,
    y: 12,
    dir: "top",
    signals: [
      { type: "protocol", signal: "I2C_SCL" },
    ],
  },

  {
    name: "DC",
    x: 54,
    y: 12,
    dir: "top",
    signals: [
      digital(0),
    ],
  },

  {
    name: "RST",
    x: 64,
    y: 12,
    dir: "top",
    signals: [
      digital(0),
    ],
  },

  {
    name: "CS",
    x: 74,
    y: 12,
    dir: "top",
    signals: [
      digital(0),
    ],
  },

  {
    name: "3VO",
    x: 83.5,
    y: 12,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "3V3",
      },
    ],
  },

  {
    name: "VIN",
    x: 93.5,
    y: 12,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "VCC",
      },
    ],
  },

  {
    name: "GND",
    x: 103,
    y: 12,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },
];