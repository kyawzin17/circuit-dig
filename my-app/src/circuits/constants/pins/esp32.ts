import { analog, i2c, spi, usart } from "./pin";

// =====================================================
// ESP32 DEVKIT V1 - 30 PIN
// =====================================================
//
// Physical layout:
//
//        ┌───────────────────────┐
//        │       ESP32           │
//        │                       │
// LEFT   │                       │   RIGHT
// SIDE   │                       │   SIDE
//        │                       │
//        └───────────────────────┘
//
// LEFT  = 15 pins
// RIGHT = 15 pins
//
// Pin coordinate system:
// x = horizontal position
// y = vertical position
// dir = direction of handle
// =====================================================
const add= 3;
const rightMin= 9.6;
export const ESP32_PIN = [
  // =====================================================
  // LEFT SIDE
  // =====================================================

  {
    name: "EN",
    x: 4.8,
    y: 21.0 + add,
    dir: "left",
    signals: [],
  },

  {
    name: "VP",
    x: 4.8,
    y: 30.6 + add,
    dir: "left",
    signals: [analog(0)],
  },

  {
    name: "VN",
    x: 4.8,
    y: 40.2 + add,
    dir: "left",
    signals: [analog(3)],
  },

  {
    name: "D34",
    x: 4.8,
    y: 49.8 + add,
    dir: "left",
    signals: [analog(6)],
  },

  {
    name: "D35",
    x: 4.8,
    y: 59.4 + add,
    dir: "left",
    signals: [analog(7)],
  },

  {
    name: "D32",
    x: 4.8,
    y: 69.0 + add,
    dir: "left",
    signals: [analog(4)],
  },

  {
    name: "D33",
    x: 4.8,
    y: 78.6 + add,
    dir: "left",
    signals: [analog(5)],
  },

  {
    name: "D25",
    x: 4.8,
    y: 88.2 + add,
    dir: "left",
    signals: [analog(8)],
  },

  {
    name: "D26",
    x: 4.8,
    y: 97.8 + add,
    dir: "left",
    signals: [analog(9)],
  },

  {
    name: "D27",
    x: 4.8,
    y: 107.4 + add,
    dir: "left",
    signals: [analog(7)],
  },

  {
    name: "D14",
    x: 4.8,
    y: 117.0 + add,
    dir: "left",
    signals: [spi("SCK")],
  },

  {
    name: "D12",
    x: 4.8,
    y: 126.6 + add,
    dir: "left",
    signals: [spi("MISO")],
  },

  {
    name: "GND",
    x: 4.8,
    y: 136.2 + add,
    dir: "left",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },

  {
    name: "D13",
    x: 4.8,
    y: 145.8 + add,
    dir: "left",
    signals: [spi("MOSI")],
  },

  {
    name: "VIN",
    x: 4.8,
    y: 155.4 + add,
    dir: "left",
    signals: [
      {
        type: "power",
        signal: "VCC",
      },
    ],
  },

  // =====================================================
  // RIGHT SIDE
  // =====================================================

  {
    name: "3V3",
    x: 101,
    y: 159 - (9.6 * 0),
    dir: "right",
    signals: [
      {
        type: "power",
        signal: "VCC",
        voltage: 3.3,
      },
    ],
  },

  {
    name: "GND.1",
    x: 101,
    y: 159 - (9.6 * 1),
    dir: "right",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },

  {
    name: "D15",
    x: 101,
    y: 159 - (9.6 * 2),
    dir: "right",
    signals: [
      spi("SS"),
    ],
  },

  {
    name: "D2",
    x: 101,
    y: 159 - (9.6 * 3),
    dir: "right",
    signals: [],
  },

  {
    name: "D4",
    x: 101,
    y: 159 - (9.6 * 4),
    dir: "right",
    signals: [],
  },

  {
    name: "D16",
    x: 101,
    y: 159 - (9.6 * 5),
    dir: "right",
    signals: [
      usart("RX"),
    ],
  },

  {
    name: "D17",
    x: 101,
    y: 159 - (9.6 * 6),
    dir: "right",
    signals: [
      usart("TX"),
    ],
  },

  {
    name: "D5",
    x: 101,
    y: 159 - (9.6 * 7),
    dir: "right",
    signals: [
      spi("SS"),
    ],
  },

  {
    name: "D18",
    x: 101,
    y: 159 - (9.6 * 8),
    dir: "right",
    signals: [
      spi("SCK"),
    ],
  },

  {
    name: "D19",
    x: 101,
    y: 159 - (9.6 * 9),
    dir: "right",
    signals: [
      spi("MISO"),
    ],
  },

  {
    name: "D21",
    x: 101,
    y: 159 - (9.6 * 10),
    dir: "right",
    signals: [
      i2c("SDA"),
    ],
  },

  {
    name: "RX0",
    x: 101,
    y: 159 - (9.6 * 11),
    dir: "right",
    signals: [
      usart("RX"),
    ],
  },

  {
    name: "TX0",
    x: 101,
    y: 159 - (9.6 * 12),
    dir: "right",
    signals: [
      usart("TX"),
    ],
  },

  {
    name: "D22",
    x: 101,
    y: 159 - (9.6 * 13),
    dir: "right",
    signals: [
      i2c("SCL"),
    ],
  },

  {
    name: "D23",
    x: 101,
    y: 159 - (9.6 * 14),
    dir: "right",
    signals: [],
  },
];