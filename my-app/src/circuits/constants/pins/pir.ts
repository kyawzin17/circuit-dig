import { digital } from "./pin";

// =====================================================
// PIR MOTION SENSOR (HC-SR501)
// =====================================================
//
// Pin layout:
//
//   ┌────────────────┐
//   │   PIR Sensor   │
//   │                │
//   │  VCC  OUT  GND │
//   └────────────────┘
//
// VCC = 5V / 3.3V Power
// OUT = Digital Signal Output (Motion Detect Signal)
// GND = Ground
// =====================================================

export const PIR_PIN = [
  {
    name: "VCC",
    x: 36,
    y: 90,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "VCC",
      },
    ],
  },

  {
    name: "OUT",
    x: 46,
    y: 90,
    dir: "top",
    signals: [
      digital(0),
    ],
  },

  {
    name: "GND",
    x: 56,
    y: 90,
    dir: "top",
    signals: [
      {
        type: "power",
        signal: "GND",
      },
    ],
  },
];