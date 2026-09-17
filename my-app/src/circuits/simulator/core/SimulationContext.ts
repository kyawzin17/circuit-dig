import type {
  Netlist,
} from "../circuit/NetlistBuilder";

import type {
  PinLevel,
} from "../types/simulator.types";

/* =========================================================
   SIMULATION CONTEXT
========================================================= */

export interface SimulationContext {
  netlist: Netlist;

  getPinLevel(
    nodeId: string,
    pinId: string,
  ): PinLevel;

  getNetLevel(
    netId: string,
  ): PinLevel;

  setLedState(
    nodeId: string,
    isOn: boolean,
    brightness?: number,
  ): void;
}