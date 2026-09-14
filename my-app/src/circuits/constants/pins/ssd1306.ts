import { spi, digital } from "./pin";

// =====================================================
// OLED SSD1306 DISPLAY (128x64 7-PIN SPI)
// =====================================================
//
// Pin layout:
//
//   ┌──────────────────────────────┐
//   │      OLED SSD1306 SPI        │
//   │      [128x64 Display]        │
//   │                              │
//   │ GND VCC D0 D1 RES DC CS      │
//   └──────────────────────────────┘
//
// =====================================================

export const OLED_SSD1306_SPI_PIN = [
  {
    name: "GND",
    x: 36,
    y: 16,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },

  {
    name: "VCC",
    x: 45,
    y: 16,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "VCC",
      },
    ],
  },

  {
    name: "D0",
    x: 54,
    y: 16,
    dir: "top",
    signals: [
      spi("SCK"),
    ],
  },

  {
    name: "D1",
    x: 74,
    y: 16,
    dir: "top",
    signals: [
      spi("MOSI"),
    ],
  },

  {
    name: "RES",
    x: 83.5,
    y: 16,
    dir: "top",
    signals: [
      digital(0),
    ],
  },

  {
    name: "DC",
    x: 93.5,
    y: 16,
    dir: "top",
    signals: [
      digital(0),
    ],
  },

  {
    name: "CS",
    x: 103,
    y: 16,
    dir: "top",
    signals: [
      digital(0),
    ],
  },
];