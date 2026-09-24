import { analog } from "./pin";

// =====================================================
// LDR / PHOTORESISTOR SENSOR
// =====================================================
//
// Pin layout:
//
//   ┌───────────────┐
//   │   LDR Sensor  │
//   │               │
//   │  VCC  GND  AO │
//   └───────────────┘
//
// VCC = 3.3V / 5V
// GND = Ground
// AO  = Analog Output
// =====================================================

export const LDR_PIN = [
  {
    name: "VCC",
    x: 174,
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
    name: "GND",
    x: 174,
    y: 25,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },

  {
    name: "D0",
    x: 174,
    y: 34,
    dir: "top",
    signals: [
        analog(0),
    ]
  },

  {
    name: "A0",
    x: 174,
    y: 45,
    dir: "top",
    signals: [
      analog(0),
    ],
  },
];