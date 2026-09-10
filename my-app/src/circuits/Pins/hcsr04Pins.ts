import type { CircuitPin } from "../types/pin.types";

// =====================================================
// ULTRASONIC SENSOR (HC-SR04) PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID.
//
// React Flow Handle IDs must be exactly the same:
//
// VCC → Handle vcc
// TRIG → Handle trig
// ECHO → Handle echo
// GND → Handle gnd
//
// An Ultrasonic Sensor has 4 distinct pins with specific
// power, signal input, and signal output roles.
//
// =====================================================

export const hcsr04Pins: CircuitPin[] = [
  // =====================================================
  // VCC (POWER)
  // =====================================================

  {
    id: "vcc",
    label: "VCC",
    alias: "5V Power",
    type: "terminal",
    direction: "passive",
    description:
      "Power supply input terminal. Connects to the positive supply voltage (typically +5V DC).",
  },

  // =====================================================
  // TRIG (TRIGGER INPUT)
  // =====================================================

  {
    id: "trig",
    label: "Trig",
    alias: "Trigger Pin",
    type: "terminal",
    direction: "passive",
    description:
      "Trigger input pin. Receiving a HIGH pulse for at least 10 microseconds commands the sensor to emit an ultrasonic sound burst.",
  },

  // =====================================================
  // ECHO (ECHO OUTPUT)
  // =====================================================

  {
    id: "echo",
    label: "Echo",
    alias: "Echo Pin",
    type: "terminal",
    direction: "passive",
    description:
      "Echo output pin. Emits a HIGH signal pulse whose duration is proportional to the distance of the detected obstacle.",
  },

  // =====================================================
  // GND (GROUND)
  // =====================================================

  {
    id: "gnd",
    label: "GND",
    alias: "Ground",
    type: "terminal",
    direction: "passive",
    description:
      "Ground reference terminal. Connects to the ground (0V) of the circuit power supply.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const hcsr04PinsById = Object.fromEntries(
  hcsr04Pins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;