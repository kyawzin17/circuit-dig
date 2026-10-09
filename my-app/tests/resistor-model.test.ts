import assert from "node:assert/strict";
import { parseResistanceOhms } from "../src/circuits/simulator/electrical/ResistorModel";

const cases: Array<[unknown, number | undefined]> = [
  [220, 220],
  ["220", 220],
  ["220Ω", 220],
  ["220 ohm", 220],
  ["4.7kΩ", 4700],
  ["4K7", 4700],
  ["4k7", 4700],
  ["2M2", 2_200_000],
  ["1M", 1_000_000],
  ["1m", 0.001],
  ["1.5k", 1500],
  ["1e3", 1000],
  ["  10 kΩ ", 10_000],
  ["", undefined],
  ["not-a-resistor", undefined],
  ["4k7extra", undefined],
  [0, undefined],
  ["0", undefined],
  [-10, undefined],
  [Number.NaN, undefined],
  [Number.POSITIVE_INFINITY, undefined],
  [null, undefined],
];

for (const [input, expected] of cases) {
  assert.equal(parseResistanceOhms(input), expected, String(input));
}

console.log(`RESISTOR MODEL: PASS (${cases.length}/${cases.length})`);
