import type {
  CircuitPinRef,
} from "../circuit/CircuitGraph";

import type {
  Netlist,
} from "../circuit/NetlistBuilder";

import type {
  PinLevel,
  PinMode,
} from "../types/simulator.types";

/* =========================================================
   DIGITAL DRIVER
========================================================= */

export interface DigitalDriver {
  pin: CircuitPinRef;

  mode: PinMode;

  level: PinLevel;
}

/* =========================================================
   DIGITAL NET STATE
========================================================= */

export interface DigitalNetState {
  netId: string;

  level: PinLevel;

  drivers: DigitalDriver[];

  conflict: boolean;
}

/* =========================================================
   SOLVER RESULT
========================================================= */

export interface DigitalSolveResult {
  nets: Map<string, DigitalNetState>;

  pinLevels: Map<string, PinLevel>;
}

/* =========================================================
   DIGITAL NET SOLVER
========================================================= */

export class DigitalNetSolver {
  solve(
    netlist: Netlist,
    drivers: DigitalDriver[],
  ): DigitalSolveResult {
    const nets =
      new Map<
        string,
        DigitalNetState
      >();

    const pinLevels =
      new Map<string, PinLevel>();

    /*
     * Group drivers by net.
     */
    for (const driver of drivers) {
      const pinKey =
        `${driver.pin.nodeId}:${driver.pin.pinId}`;

      const netId =
        netlist.pinToNet.get(pinKey);

      if (!netId) {
        continue;
      }

      let net =
        nets.get(netId);

      if (!net) {
        net = {
          netId,

          level: 0,

          drivers: [],

          conflict: false,
        };

        nets.set(
          netId,
          net,
        );
      }

      net.drivers.push(driver);
    }

    /*
     * Resolve every net.
     */
    for (const [
      netId,
      net,
    ] of nets) {
      const result =
        this.resolveDrivers(
          net.drivers,
        );

      net.level =
        result.level;

      net.conflict =
        result.conflict;

      const pins =
        netlist.netToPins.get(
          netId,
        ) ?? [];

      for (const pin of pins) {
        pinLevels.set(
          `${pin.nodeId}:${pin.pinId}`,
          net.level,
        );
      }
    }

    return {
      nets,
      pinLevels,
    };
  }

  /* =======================================================
     RESOLVE
  ======================================================= */

  private resolveDrivers(
    drivers: DigitalDriver[],
  ): {
    level: PinLevel;
    conflict: boolean;
  } {
    const outputDrivers =
      drivers.filter(
        (driver) =>
          driver.mode === "output",
      );

    /*
     * No output driver:
     *
     * default LOW for now.
     *
     * Later:
     * - floating
     * - pullup
     * - pulldown
     */
    if (
      outputDrivers.length === 0
    ) {
      return {
        level: 0,
        conflict: false,
      };
    }

    const hasHigh =
      outputDrivers.some(
        (driver) =>
          driver.level === 1,
      );

    const hasLow =
      outputDrivers.some(
        (driver) =>
          driver.level === 0,
      );

    /*
     * HIGH + LOW on same net
     * means electrical conflict.
     */
    if (
      hasHigh &&
      hasLow
    ) {
      return {
        level: 0,
        conflict: true,
      };
    }

    return {
      level:
        hasHigh
          ? 1
          : 0,

      conflict: false,
    };
  }
}