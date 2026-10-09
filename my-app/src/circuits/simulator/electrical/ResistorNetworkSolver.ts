/**
 * DC resistive-network solver for resistor and equivalent-load branches.
 *
 * Solves Kirchhoff's Current Law at every unknown net using nodal analysis.
 * Fixed source/ground voltages are boundary conditions. Directed devices
 * (LEDs/diodes) use a piecewise-linear forward-drop approximation and an
 * active-set iteration; this is not a transient or full SPICE simulator.
 */

export interface ElectricalBranch {
  componentId: string;
  componentType: string;
  fromNet: string;
  toNet: string;
  resistanceOhm: number;
  voltageDrop: number;
  directed: boolean;
}

export interface ElectricalNetworkResult {
  netVoltages: Map<string, number>;
  branchCurrentMa: Map<string, number>;
  branchVoltageDrop: Map<string, number>;
  branchPowerMw: Map<string, number>;
  totalSourceCurrentMa: number;
  activeNets: Set<string>;
  activeComponents: Set<string>;
  converged: boolean;
}

const MIN_BRANCH_RESISTANCE_OHM = 0.001;
const DIODE_INTERNAL_RESISTANCE_OHM = 1;
const CURRENT_EPSILON_A = 1e-8;

function branchResistance(branch: ElectricalBranch): number {
  if (branch.resistanceOhm > 0 && Number.isFinite(branch.resistanceOhm)) {
    return branch.resistanceOhm;
  }
  // Ideal switches/contacts need a finite numerical resistance for nodal analysis.
  return branch.directed ? DIODE_INTERNAL_RESISTANCE_OHM : MIN_BRANCH_RESISTANCE_OHM;
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] | undefined {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return undefined;
    [a[col], a[pivot]] = [a[pivot], a[col]];

    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      if (Math.abs(factor) < 1e-18) continue;
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }

  return a.map((row) => row[n]);
}

function solveWithActiveSet(
  nets: string[],
  branches: ElectricalBranch[],
  fixedVoltages: Map<string, number>,
): Map<string, number> | undefined {
  const active = new Set<string>();
  for (const branch of branches) {
    if (branch.directed) active.add(branchKey(branch));
  }

  let voltages = new Map(fixedVoltages);

  for (let iteration = 0; iteration < 30; iteration++) {
    const conductingBranches = branches.filter(
      (branch) => !branch.directed || active.has(branchKey(branch)),
    );

    // A reverse-biased diode can disconnect a floating island. Do not let
    // that physically open branch make the whole nodal matrix singular.
    const activeAdjacency = new Map<string, Set<string>>();
    for (const branch of conductingBranches) {
      if (branch.fromNet === branch.toNet) continue;
      if (!activeAdjacency.has(branch.fromNet)) activeAdjacency.set(branch.fromNet, new Set());
      if (!activeAdjacency.has(branch.toNet)) activeAdjacency.set(branch.toNet, new Set());
      activeAdjacency.get(branch.fromNet)!.add(branch.toNet);
      activeAdjacency.get(branch.toNet)!.add(branch.fromNet);
    }

    const connected = new Set<string>();
    const queue = [...fixedVoltages.keys()].filter((net) => nets.includes(net));
    queue.forEach((net) => connected.add(net));
    while (queue.length) {
      const net = queue.shift()!;
      for (const next of activeAdjacency.get(net) ?? []) {
        if (connected.has(next)) continue;
        connected.add(next);
        queue.push(next);
      }
    }

    const unknownNets = nets.filter((net) => !fixedVoltages.has(net) && connected.has(net));
    const netIndex = new Map(unknownNets.map((net, i) => [net, i] as const));
    const n = unknownNets.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    const rhs = Array(n).fill(0);

    for (const branch of conductingBranches) {
      if (!connected.has(branch.fromNet) || !connected.has(branch.toNet)) continue;
      const ia = netIndex.get(branch.fromNet);
      const ib = netIndex.get(branch.toNet);
      if (ia === undefined && ib === undefined) continue;

      const conductance = 1 / branchResistance(branch);
      const drop = branch.directed ? Math.max(0, branch.voltageDrop) : 0;

      if (ia !== undefined) {
        matrix[ia][ia] += conductance;
        if (ib !== undefined) matrix[ia][ib] -= conductance;
        else rhs[ia] += conductance * (fixedVoltages.get(branch.toNet) ?? 0);
        rhs[ia] += conductance * drop;
      }
      if (ib !== undefined) {
        matrix[ib][ib] += conductance;
        if (ia !== undefined) matrix[ib][ia] -= conductance;
        else rhs[ib] += conductance * (fixedVoltages.get(branch.fromNet) ?? 0);
        rhs[ib] -= conductance * drop;
      }
    }

    const solution = n ? solveLinearSystem(matrix, rhs) : [];
    if (!solution) return undefined;
    voltages = new Map(fixedVoltages);
    unknownNets.forEach((net, i) => voltages.set(net, solution[i]));

    let changed = false;
    for (const branch of branches) {
      if (!branch.directed) continue;
      const fromVoltage = voltages.get(branch.fromNet);
      const toVoltage = voltages.get(branch.toNet);
      const shouldBeActive =
        fromVoltage !== undefined &&
        toVoltage !== undefined &&
        fromVoltage - toVoltage > Math.max(0, branch.voltageDrop) + 1e-9;
      const key = branchKey(branch);
      if (shouldBeActive && !active.has(key)) {
        active.add(key);
        changed = true;
      } else if (!shouldBeActive && active.has(key)) {
        active.delete(key);
        changed = true;
      }
    }
    if (!changed) return voltages;
  }

  return voltages;
}

function branchKey(branch: ElectricalBranch): string {
  return branch.componentId + "|" + branch.fromNet + "|" + branch.toNet;
}

/**
 * Solve only connected network islands that contain at least one known-voltage
 * net. Unpowered floating islands are intentionally left unresolved.
 */
export function solveElectricalNetwork(
  branches: ElectricalBranch[],
  fixedVoltages: Map<string, number>,
  sourceNets: Set<string> = new Set(),
): ElectricalNetworkResult {
  const adjacency = new Map<string, Set<string>>();
  for (const branch of branches) {
    if (!branch.fromNet || !branch.toNet || branch.fromNet === branch.toNet) continue;
    if (!adjacency.has(branch.fromNet)) adjacency.set(branch.fromNet, new Set());
    if (!adjacency.has(branch.toNet)) adjacency.set(branch.toNet, new Set());
    adjacency.get(branch.fromNet)!.add(branch.toNet);
    adjacency.get(branch.toNet)!.add(branch.fromNet);
  }

  const allVoltages = new Map<string, number>();
  const visited = new Set<string>();
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    const island: string[] = [];
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const net = queue.shift()!;
      island.push(net);
      for (const next of adjacency.get(net) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    if (!island.some((net) => fixedVoltages.has(net))) continue;
    const islandSet = new Set(island);
    const islandBranches = branches.filter((branch) => islandSet.has(branch.fromNet) && islandSet.has(branch.toNet));
    const islandFixed = new Map([...fixedVoltages].filter(([net]) => islandSet.has(net)));
    const solved = solveWithActiveSet(island, islandBranches, islandFixed);
    if (solved) for (const [net, voltage] of solved) allVoltages.set(net, voltage);
  }

  const branchCurrentMa = new Map<string, number>();
  const branchVoltageDrop = new Map<string, number>();
  const branchPowerMw = new Map<string, number>();
  let totalSourceCurrentA = 0;
  const activeNets = new Set<string>();
  const activeComponents = new Set<string>();

  for (const branch of branches) {
    const va = allVoltages.get(branch.fromNet);
    const vb = allVoltages.get(branch.toNet);
    if (va === undefined || vb === undefined) continue;

    const resistance = branchResistance(branch);
    const rawCurrentA = (va - vb - (branch.directed ? Math.max(0, branch.voltageDrop) : 0)) / resistance;
    const currentA = branch.directed ? Math.max(0, rawCurrentA) : rawCurrentA;
    const currentMa = Math.abs(currentA) * 1000;
    const voltageDrop = Math.abs(va - vb);

    for (const sourceNet of sourceNets) {
      if (branch.fromNet === sourceNet) totalSourceCurrentA += currentA;
      else if (branch.toNet === sourceNet) totalSourceCurrentA -= currentA;
    }

    branchCurrentMa.set(branch.componentId, Math.max(branchCurrentMa.get(branch.componentId) ?? 0, currentMa));
    branchVoltageDrop.set(branch.componentId, Math.max(branchVoltageDrop.get(branch.componentId) ?? 0, voltageDrop));
    const powerMw = branch.componentType === "resistor"
      ? (currentMa * currentMa * branch.resistanceOhm) / 1000
      : currentMa * (branch.directed ? Math.max(0, branch.voltageDrop) : voltageDrop);
    branchPowerMw.set(branch.componentId, Math.max(branchPowerMw.get(branch.componentId) ?? 0, powerMw));

    const isElectricallyActive = branch.directed
      ? currentMa > CURRENT_EPSILON_A * 1000
      : currentMa > CURRENT_EPSILON_A * 1000 || voltageDrop > 1e-6;
    if (isElectricallyActive) {
      activeComponents.add(branch.componentId);
      activeNets.add(branch.fromNet);
      activeNets.add(branch.toNet);
    }
  }

  return {
    netVoltages: allVoltages,
    branchCurrentMa,
    branchVoltageDrop,
    branchPowerMw,
    totalSourceCurrentMa: Math.max(0, totalSourceCurrentA * 1000),
    activeNets,
    activeComponents,
    converged: true,
  };
}
