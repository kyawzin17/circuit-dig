import type { Node } from "reactflow";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";
import type { Netlist } from "../circuit/NetlistBuilder";
import type { PinLevel, PinMode } from "../types/simulator.types";
import type { PowerRailState } from "./PowerRailSolver";

export interface DigitalInputState {
  pinLevels: Map<string, PinLevel>;
  conflicts: string[];
  floatingPins: string[];
}

type PinKey = string;

function createKey(nodeId: string, pinId: string): PinKey {
  return nodeId + ":" + pinId.trim();
}

function typeOf(node: Node): string {
  return String(
    node.data?.componentType ?? node.type ?? "",
  ).toLowerCase();
}

function isArduinoUno(node: Node): boolean {
  return typeOf(node) === "arduino-uno";
}

function isPushButton(type: string): boolean {
  return type === "pushbutton" || type === "button";
}

function isClosedSwitch(node: Node): boolean {
  const type = typeOf(node);

  if (isPushButton(type)) {
    return (
      node.data?.pressed === true ||
      node.data?.isPressed === true
    );
  }

  if (type === "slide-switch" || type === "switch") {
    return (
      node.data?.on === true ||
      node.data?.isOn === true ||
      node.data?.closed === true
    );
  }

  return false;
}

function isInputMode(mode: PinMode): boolean {
  return mode === "input" || mode === "input_pullup";
}

/**
 * Resolves the external logic level seen by AVR GPIO input pins.
 *
 * This intentionally works at the circuit graph level instead of
 * writing JavaScript values directly into digitalRead().
 *
 * Physical wires connect pins, passive components can bridge pins,
 * fixed Arduino power rails provide HIGH/LOW sources, and a pressed
 * pushbutton closes its two internal contact groups.
 */
export class DigitalInputSolver {
  solve(
    nodes: Node[],
    netlist: Netlist,
    drivers: ArduinoDigitalDriver[],
    powerState: PowerRailState,
    inputModes: Map<string, PinMode>,
  ): DigitalInputState {
    const adjacency = new Map<PinKey, Set<PinKey>>();

    const connect = (a: PinKey, b: PinKey): void => {
      if (!adjacency.has(a)) {
        adjacency.set(a, new Set());
      }

      if (!adjacency.has(b)) {
        adjacency.set(b, new Set());
      }

      adjacency.get(a)!.add(b);
      adjacency.get(b)!.add(a);
    };

    // Physical wires.
    for (const [wireId] of netlist.wireToNet) {
      void wireId;
    }

    for (const net of netlist.nets) {
      for (let index = 1; index < net.pins.length; index += 1) {
        const previous = net.pins[index - 1];
        const current = net.pins[index];

        connect(
          createKey(previous.nodeId, previous.pinId),
          createKey(current.nodeId, current.pinId),
        );
      }
    }

    // Passive component bridges needed for digital input propagation.
    for (const node of nodes) {
      const type = typeOf(node);

      if (type === "resistor") {
        connect(
          createKey(node.id, "pin1"),
          createKey(node.id, "pin2"),
        );
        continue;
      }

      if (isPushButton(type)) {
        // 4-pin tactile switch:
        // 1.l <-> 1.r and 2.l <-> 2.r are always connected.
        connect(
          createKey(node.id, "1.l"),
          createKey(node.id, "1.r"),
        );

        connect(
          createKey(node.id, "2.l"),
          createKey(node.id, "2.r"),
        );

        if (isClosedSwitch(node)) {
          connect(
            createKey(node.id, "1.r"),
            createKey(node.id, "2.r"),
          );
        }

        continue;
      }

      if (
        type === "slide-switch" ||
        type === "switch"
      ) {
        if (isClosedSwitch(node)) {
          connect(
            createKey(node.id, "pin1"),
            createKey(node.id, "pin2"),
          );
        }
      }
    }

    const sourceLevels = new Map<PinKey, PinLevel>();
    const sourceLabels = new Map<PinKey, string>();

    // Fixed power sources / ground.
    for (const [netId, voltage] of Object.entries(
      powerState.netVoltages,
    )) {
      if (typeof voltage !== "number") {
        continue;
      }

      const level: PinLevel = voltage >= 2.5 ? 1 : 0;

      for (const pin of netlist.netToPins.get(netId) ?? []) {
        const key = createKey(pin.nodeId, pin.pinId);

        sourceLevels.set(key, level);
        sourceLabels.set(
          key,
          level === 1 ? "POWER_HIGH" : "GROUND",
        );
      }
    }

    // Digital outputs are real electrical sources.
    for (const driver of drivers) {
      const matchingPins = nodes.filter(isArduinoUno);

      for (const board of matchingPins) {
        const pinKey = createKey(board.id, driver.pin);
        sourceLevels.set(pinKey, driver.level);
        sourceLabels.set(
          pinKey,
          driver.level === 1
            ? "GPIO_HIGH"
            : "GPIO_LOW",
        );
      }
    }

    const pinLevels = new Map<string, PinLevel>();
    const conflicts: string[] = [];
    const floatingPins: string[] = [];

    for (const node of nodes) {
      if (!isArduinoUno(node)) {
        continue;
      }

      for (let pin = 0; pin <= 13; pin += 1) {
        const pinName = "D" + pin;
        const pinKey = createKey(node.id, pinName);
        const mode = inputModes.get(pinName) ?? "input";

        if (!isInputMode(mode)) {
          continue;
        }

        const queue: PinKey[] = [pinKey];
        const visited = new Set<PinKey>([pinKey]);
        const levels = new Set<PinLevel>();
        let reachedSource = false;

        while (queue.length > 0) {
          const current = queue.shift()!;

          const directLevel = sourceLevels.get(current);

          if (directLevel !== undefined) {
            levels.add(directLevel);
            reachedSource = true;
          }

          for (const next of adjacency.get(current) ?? []) {
            if (visited.has(next)) {
              continue;
            }

            visited.add(next);
            queue.push(next);
          }
        }

        if (levels.has(0) && levels.has(1)) {
          conflicts.push(
            "DIGITAL_INPUT_CONFLICT:" + pinKey,
          );
          pinLevels.set(pinKey, 0);
          continue;
        }

        if (levels.size === 1) {
          pinLevels.set(
            pinKey,
            levels.values().next().value as PinLevel,
          );
          continue;
        }

        if (!reachedSource) {
          if (mode === "input_pullup") {
            pinLevels.set(pinKey, 1);
          } else {
            pinLevels.set(pinKey, 0);
            floatingPins.push(pinKey);
          }
        }
      }
    }

    void sourceLabels;

    return {
      pinLevels,
      conflicts,
      floatingPins,
    };
  }
}
