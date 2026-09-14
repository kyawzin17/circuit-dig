import { i2c } from "./pin";

// =====================================================
// RTC DS1307 MODULE
// =====================================================
//
// Pin layout:
//
//   ┌──────────────────────┐
//   │   RTC DS1307 Module  │
//   │                      │
//   │ SQW SCL SDA VCC GND  │
//   └──────────────────────┘
//
// =====================================================

export const RTC_DS1307_PIN = [
  {
    name: "SQW",
    x: 10,
    y: 53.5,
    dir: "top",
    signals: [
      {
        type: "digital",
        signal: "SQW",
      },
    ],
  },

  {
    name: "SCL",
    x: 10,
    y: 44.6,
    dir: "top",
    signals: [
      i2c("SCL"),
    ],
  },

  {
    name: "SDA",
    x: 10,
    y: 34.8,
    dir: "top",
    signals: [
      i2c("SDA"),
    ],
  },

  {
    name: "VCC",
    x: 10,
    y: 25.3,
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
    x: 10,
    y: 15,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },

];