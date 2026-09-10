import type { CircuitPin } from "../types/pin.types";

// =====================================================
// BUZZER PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID.
//
// React Flow Handle IDs must be exactly the same:
//
// Positive → Handle positive
// Negative → Handle negative
//
// Most buzzers (especially active buzzers) are polarized, 
// so the Positive (+) and Negative (-) terminals are NOT 
// electrically interchangeable.
//
// =====================================================

export const buzzerPins: CircuitPin[] = [
  // =====================================================
  // POSITIVE TERMINAL (+)
  // =====================================================

  {
    id: "positive",
    label: "Positive",
    alias: "VCC / Signal (+)",
    type: "terminal",
    direction: "passive",
    description:
      "The positive terminal of the buzzer. For active buzzers, this connects to a DC voltage source. For passive buzzers, it connects to a PWM or audio signal.",
  },

  // =====================================================
  // NEGATIVE TERMINAL (-)
  // =====================================================

  {
    id: "negative",
    label: "Negative",
    alias: "GND (-)",
    type: "terminal",
    direction: "passive",
    description:
      "The negative terminal of the buzzer. This terminal should typically be connected to the ground (GND) of the circuit.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const buzzerPinsById = Object.fromEntries(
  buzzerPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;