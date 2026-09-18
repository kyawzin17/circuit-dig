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

    console.log("DIGITAL NET SOLVER DEBUG", {
      result,
    });
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
