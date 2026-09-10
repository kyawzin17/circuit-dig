import type { CircuitPin } from "../types/pin.types";

// =====================================================
// SERVO MOTOR PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID.
//
// React Flow Handle IDs must be exactly the same:
//
// VCC → Handle vcc
// GND → Handle gnd
// Signal → Handle signal
//
// Standard RC servo motors have 3 dedicated pins: Power,
// Ground, and PWM Signal control.
//
// =====================================================

export const servoPins: CircuitPin[] = [
  // =====================================================
  // VCC (POWER)
  // =====================================================

  {
    id: "vcc",
    label: "VCC",
    alias: "Power (+5V)",
    type: "terminal",
    direction: "passive",
    description:
      "Power supply terminal for the servo motor. Connects to a positive voltage source (typically 4.8V - 6V DC, usually Red wire).",
  },

  // =====================================================
  // GND (GROUND)
  // =====================================================

  {
    id: "gnd",
    label: "GND",
    alias: "Ground (0V)",
    type: "terminal",
    direction: "passive",
    description:
      "Ground reference terminal. Connects to the ground (0V) of the power supply (usually Brown or Black wire).",
  },

  // =====================================================
  // SIGNAL (PWM CONTROL)
  // =====================================================

  {
    id: "signal",
    label: "Signal",
    alias: "PWM Input",
    type: "terminal",
    direction: "passive",
    description:
      "Control signal input pin. Receives PWM (Pulse Width Modulation) signals from the microcontroller to set the shaft position (usually Orange or Yellow wire).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const servoPinsById = Object.fromEntries(
  servoPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;