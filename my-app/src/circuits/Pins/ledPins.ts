import type { CircuitPin } from "../types/pin.types";

// =====================================================
// LED PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID.
//
// React Flow Handle IDs must be exactly the same:
//
// Anode → Handle anode
// Cathode → Handle cathode
//
// An LED is polarized, so the Anode (+) and Cathode (-)
// are NOT electrically interchangeable.
//
// =====================================================

export const ledPins: CircuitPin[] = [
  // =====================================================
  // ANODE (+)
  // =====================================================

  {
    id: "anode",
    label: "Anode",
    alias: "Positive (+)",
    type: "terminal",
    direction: "passive",
    description:
      "The positive terminal (Anode) of the LED. Current must flow from Anode to Cathode for the LED to emit light.",
  },

  // =====================================================
  // CATHODE (-)
  // =====================================================

  {
    id: "cathode",
    label: "Cathode",
    alias: "Negative (-)",
    type: "terminal",
    direction: "passive",
    description:
      "The negative terminal (Cathode) of the LED. This terminal should typically point towards the ground or negative side of the voltage source.",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const ledPinsById = Object.fromEntries(
  ledPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;