<<<<<<< HEAD
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
=======
import type { Netlist } from "../circuit/NetlistBuilder";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";
import { createPinKey } from "../circuit/CircuitGraph";

export type DigitalNetState = {
  level: 0 | 1;
  driven: boolean;
  conflict: boolean;
};

export type DigitalSolveResult = Map<string, DigitalNetState>;

export class DigitalNetSolver {
  solve(netlist: Netlist, drivers: ArduinoDigitalDriver[]): DigitalSolveResult {
    const result: DigitalSolveResult = new Map();

    for (const net of netlist.nets) {
      const driversForNet = drivers.filter((driver) =>
        net.pins.some((pin) =>
          pin.pinId.toUpperCase() === driver.pin.toUpperCase()
        )
      );

      const hasHigh = driversForNet.some((driver) => driver.level === 1);
      const hasLow = driversForNet.some((driver) => driver.level === 0);
      const hasGround = net.pins.some((pin) => /^GND(?:\d+)?$/i.test(pin.pinId));
      const conflict = hasHigh && hasLow;

      result.set(net.id, {
        level: conflict ? 0 : hasHigh ? 1 : 0,
        driven: driversForNet.length > 0 || hasGround,
        conflict,
      });
    }

    return result;
  }

  getPinLevel(
    netlist: Netlist,
    states: DigitalSolveResult,
    nodeId: string,
    pinId: string
  ): 0 | 1 {
    const netId = netlist.pinToNet.get(createPinKey({ nodeId, pinId }));
    return netId ? (states.get(netId)?.level ?? 0) : 0;
  }
}
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
