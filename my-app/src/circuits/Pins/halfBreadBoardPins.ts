import type { CircuitPin } from "../types/pin.types";

// =====================================================
// HALF-SIZE BREADBOARD PIN DEFINITIONS
// =====================================================

const generateHalfBreadboardPins = (): CircuitPin[] => {
  const pins: CircuitPin[] = [];
  const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  // 1. Terminal Grid (30 Rows x 10 Columns = 300 Pins)
  for (let row = 1; row <= 30; row++) {
    for (const col of columns) {
      const isLeftSide = ["A", "B", "C", "D", "E"].includes(col);
      const sideName = isLeftSide ? "Left (A-E)" : "Right (F-J)";
      const pinId = `pin_${col}${row}`;

      pins.push({
        id: pinId,
        label: `${col}${row}`,
        alias: `Row ${row} Tie-Point ${col}`,
        type: "terminal",
        direction: "passive",
        description: `Terminal point ${col}${row} on Row ${row} (${sideName}). All 5 pins in Row ${row} on this side are electrically connected.`,
      });
    }
  }

  // 2. Power Rails (4 Vertical Rails x 30 Rows = 120 Pins)
  // Matches powerCols in BreadboardHalfNode: gnd-l, vcc-l, vcc-r, gnd-r
  const powerRails = [
    { type: "gnd", id: "gnd-l", name: "Left Ground Rail (GND-L)", isGround: true },
    { type: "vcc", id: "vcc-l", name: "Left Power Rail (VCC-L)", isGround: false },
    { type: "vcc", id: "vcc-r", name: "Right Power Rail (VCC-R)", isGround: false },
    { type: "gnd", id: "gnd-r", name: "Right Ground Rail (GND-R)", isGround: true },
  ];

  for (let row = 1; row <= 30; row++) {
    for (const rail of powerRails) {
      // Handle ID Structure: `${power.type}_${power.id}_${row}`
      const pinId = `${rail.type}_${rail.id}_${row}`;

      pins.push({
        id: pinId,
        label: `${rail.id.toUpperCase()}_${row}`,
        alias: `${rail.name} Row ${row}`,
        type: rail.isGround ? "ground" : "power",
        direction: "passive",
        description: `${rail.name} point at row ${row}.`,
      });
    }
  }

  return pins;
};

export const halfBreadboardPins: CircuitPin[] = generateHalfBreadboardPins();

// =====================================================
// PIN LOOKUP
// =====================================================

export const halfBreadboardPinsById = Object.fromEntries(
  halfBreadboardPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;