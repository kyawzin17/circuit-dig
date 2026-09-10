import type { CircuitPin } from "../types/pin.types";

// =====================================================
// MINI BREADBOARD (170 TIE-POINTS) PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID (e.g., "a1", "e1", "f17", "j17").
//
// React Flow Handle IDs must match exactly.
//
// Mini Breadboard features 17 rows (1 to 17) and 10 columns (a-e, f-j).
// Pins in the same row on the same side (a-e OR f-j) are electrically connected.
//
// =====================================================

const generateMiniBreadboardPins = (): CircuitPin[] => {
  const pins: CircuitPin[] = [];
  const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  for (let row = 1; row <= 17; row++) {
    for (const col of columns) {
      const isLeftSide = ["A", "B", "C", "D", "E"].includes(col);
      const sideName = isLeftSide ? "Left (A-E)" : "Right (F-J)";
      const pinId = `pin_${col}${row}`;

      pins.push({
        id: pinId,
        label: `${col.toUpperCase()}${row}`,
        alias: `Row ${row} Tie-Point ${col.toUpperCase()}`,
        type: "terminal",
        direction: "passive",
        description: `Tie-point ${col.toUpperCase()}${row} on Row ${row} (${sideName} strip). All 5 pins in Row ${row} on this side are electrically connected.`,
      });
    }
  }

  return pins;
};

export const miniBreadboardPins: CircuitPin[] = generateMiniBreadboardPins();

// =====================================================
// PIN LOOKUP
// =====================================================

export const miniBoardPinsById = Object.fromEntries(
  miniBreadboardPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;