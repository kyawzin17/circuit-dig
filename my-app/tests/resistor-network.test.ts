import assert from "node:assert/strict";
import { solveElectricalNetwork, type ElectricalBranch } from "../src/circuits/simulator/electrical/ResistorNetworkSolver";

function approx(actual: number | undefined, expected: number, tolerance = 1e-6) {
  assert.notEqual(actual, undefined);
  assert.ok(Math.abs(actual! - expected) <= tolerance, `expected ${expected}, got ${actual}`);
}

function branch(id: string, fromNet: string, toNet: string, resistanceOhm: number): ElectricalBranch {
  return { componentId: id, componentType: "resistor", fromNet, toNet, resistanceOhm, voltageDrop: 0, directed: false };
}

function testSeriesResistors() {
  const result = solveElectricalNetwork([
    branch("r1", "VCC", "MID", 1000),
    branch("r2", "MID", "GND", 1000),
  ], new Map([["VCC", 5], ["GND", 0]]));

  approx(result.netVoltages.get("MID"), 2.5);
  approx(result.branchCurrentMa.get("r1"), 2.5);
  approx(result.branchCurrentMa.get("r2"), 2.5);
  approx(result.branchVoltageDrop.get("r1"), 2.5);
  approx(result.branchVoltageDrop.get("r2"), 2.5);
}

function testParallelResistors() {
  const result = solveElectricalNetwork([
    branch("r1", "VCC", "GND", 1000),
    branch("r2", "VCC", "GND", 1000),
  ], new Map([["VCC", 5], ["GND", 0]]));

  approx(result.branchCurrentMa.get("r1"), 5);
  approx(result.branchCurrentMa.get("r2"), 5);
}

function testUnequalParallelAndSeries() {
  const result = solveElectricalNetwork([
    branch("r1", "VCC", "MID", 1000),
    branch("r2", "MID", "GND", 2000),
    branch("r3", "MID", "GND", 2000),
  ], new Map([["VCC", 9], ["GND", 0]]));

  // R1 is in series with two 2kΩ branches in parallel: Rtotal = 2kΩ.
  approx(result.netVoltages.get("MID"), 4.5);
  approx(result.branchCurrentMa.get("r1"), 4.5);
  approx(result.branchCurrentMa.get("r2"), 2.25);
  approx(result.branchCurrentMa.get("r3"), 2.25);
}

function testLedForwardDropApproximation() {
  const result = solveElectricalNetwork([
    branch("r1", "VCC", "ANODE", 220),
    {
      componentId: "led1",
      componentType: "led",
      fromNet: "ANODE",
      toNet: "GND",
      resistanceOhm: 1,
      voltageDrop: 2,
      directed: true,
    },
  ], new Map([["VCC", 5], ["GND", 0]]));

  approx(result.netVoltages.get("ANODE"), 2.0135746606, 1e-5);
  approx(result.branchCurrentMa.get("r1"), 13.5746606, 1e-4);
  approx(result.branchCurrentMa.get("led1"), 13.5746606, 1e-4);
}

function testOpenCircuitIslandIsUnresolved() {
  const result = solveElectricalNetwork([
    branch("r1", "FLOAT1", "FLOAT2", 1000),
  ], new Map([["VCC", 5], ["GND", 0]]));

  assert.equal(result.netVoltages.has("FLOAT1"), false);
  assert.equal(result.netVoltages.has("FLOAT2"), false);
  assert.equal(result.branchCurrentMa.has("r1"), false);
}

for (const [name, testCase] of [
  ["series resistor network", testSeriesResistors],
  ["parallel resistor network", testParallelResistors],
  ["mixed series/parallel network", testUnequalParallelAndSeries],
  ["LED forward-drop approximation", testLedForwardDropApproximation],
  ["floating open-circuit island", testOpenCircuitIslandIsUnresolved],
] as const) {
  testCase();
  console.log(`PASS  ${name}`);
}
console.log("RESISTOR NETWORK: PASS (5/5)");
