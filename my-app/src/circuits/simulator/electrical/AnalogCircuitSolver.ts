import type { Node } from "reactflow";
import type { ArduinoDigitalDriver } from "../boards/ArduinoUnoRuntime";
import type { Netlist } from "../circuit/NetlistBuilder";
import type { PowerRailState } from "./PowerRailSolver";

export interface AnalogInputState {
  pinVoltages: Map<string, number>;
  pinValues: Map<string, number>;

  /**
   * Digital sensor outputs are electrical sources resolved by
   * the analog component model. The map key is the component
   * terminal's net id, not an Arduino pin number.
   */
  digitalOutputs: Map<string, 0 | 1>;

  /**
   * Debug/diagnostic values for analog sensors.
   * Keyed by component id.
   */
  sensorVoltages: Map<string, number>;
  sensorResistanceOhms: Map<string, number>;

  conflicts: string[];
}

function typeOf(node: Node): string {
  return String(
    node.data?.componentType ?? node.type ?? "",
  ).toLowerCase();
}

function isArduinoUno(node: Node): boolean {
  return typeOf(node) === "arduino-uno";
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(min, Math.min(max, value));
}

function readNumber(
  candidates: unknown[],
  fallback: number,
  min: number,
  max: number,
): number {
  for (const candidate of candidates) {
    const numeric = Number(candidate);

    if (Number.isFinite(numeric)) {
      return clamp(numeric, min, max);
    }
  }

  return fallback;
}

function readPotentiometerPosition(
  node: Node,
): number {
  return readNumber(
    [
      node.data?.potentiometerPosition,
      node.data?.wiperPosition,
      node.data?.value,
    ],
    0.5,
    0,
    1,
  );
}

function readLdrLux(node: Node): number {
  return readNumber(
    [
      node.data?.ldrLux,
      node.data?.lux,
    ],
    500,
    0.1,
    100000,
  );
}

function readLdrRl10(node: Node): number {
  return readNumber(
    [
      node.data?.ldrRl10,
      node.data?.rl10,
    ],
    50,
    0.1,
    100000,
  );
}

function readLdrGamma(node: Node): number {
  return readNumber(
    [
      node.data?.ldrGamma,
      node.data?.gamma,
    ],
    0.7,
    0.05,
    10,
  );
}

function readLdrThreshold(node: Node): number {
  return readNumber(
    [
      node.data?.ldrThreshold,
      node.data?.threshold,
    ],
    2.5,
    0,
    5,
  );
}

function voltageForNet(
  netId: string | null,
  powerState: PowerRailState,
  sourceVoltages: Map<string, number>,
): number | undefined {
  if (!netId) {
    return undefined;
  }

  const sourceVoltage =
    sourceVoltages.get(netId);

  if (typeof sourceVoltage === "number") {
    return sourceVoltage;
  }

  const railVoltage =
    powerState.netVoltages[netId];

  return typeof railVoltage === "number"
    ? railVoltage
    : undefined;
}

/**
 * First-order analog sensor solver.
 *
 * The important rule is that sensors are NOT shortcuts around
 * the firmware. This class only converts a physical component
 * state into an electrical voltage/logic source. AVR8JS still
 * performs analogRead()/digitalRead() against those resolved
 * circuit values.
 *
 * Supported here:
 * - Potentiometer: VCC/GND -> SIG voltage
 * - Wokwi photoresistor module:
 *     VCC -> LDR -> AO -> 10K -> GND
 *   plus the module's comparator-style DO output.
 */
export class AnalogCircuitSolver {
  solve(
    nodes: Node[],
    netlist: Netlist,
    drivers: ArduinoDigitalDriver[],
    powerState: PowerRailState,
  ): AnalogInputState {
    const sourceVoltages =
      new Map<string, number>();

    const arduinoBoards =
      nodes.filter(isArduinoUno);

    /*
     * Firmware-driven Arduino GPIO sources.
     *
     * PWM is represented as an average voltage here for sensor
     * inputs. CurrentFlowSolver handles PWM current separately.
     */
    for (const driver of drivers) {
      const board =
        arduinoBoards[0];

      if (!board) {
        continue;
      }

      const netId =
        netlist.pinToNet.get(
          board.id + ":" + driver.pin,
        );

      if (!netId) {
        continue;
      }

      const voltage =
        driver.pwmDuty !== undefined
          ? 5 * driver.pwmDuty
          : driver.level * 5;

      sourceVoltages.set(
        netId,
        clamp(voltage, 0, 5),
      );
    }

    const netVoltages =
      new Map<string, number>();

    /*
     * Fixed Arduino rails: 5V, 3.3V, GND, IOREF.
     */
    for (const [
      netId,
      voltage,
    ] of Object.entries(
      powerState.netVoltages,
    )) {
      if (typeof voltage === "number") {
        netVoltages.set(
          netId,
          clamp(voltage, 0, 5),
        );
      }
    }

    /*
     * Firmware GPIO sources override fixed net values when the
     * net is actually driven by a GPIO pin.
     */
    for (const [
      netId,
      voltage,
    ] of sourceVoltages) {
      netVoltages.set(
        netId,
        voltage,
      );
    }

    const digitalOutputs =
      new Map<string, 0 | 1>();

    const sensorVoltages =
      new Map<string, number>();

    const sensorResistanceOhms =
      new Map<string, number>();

    const conflicts: string[] = [];

    /*
     * =========================================================
     * POTENTIOMETER
     * =========================================================
     *
     * VCC ---- resistive track ---- GND
     *                 |
     *                SIG
     */
    for (const component of netlist.components) {
      if (
        component.type !== "potentiometer" &&
        component.type !== "pot"
      ) {
        continue;
      }

      const node =
        nodes.find(
          (candidate) =>
            candidate.id === component.id,
        );

      if (!node) {
        continue;
      }

      const vccNet =
        component.terminals.VCC ?? null;

      const gndNet =
        component.terminals.GND ?? null;

      const sigNet =
        component.terminals.SIG ?? null;

      const vcc =
        voltageForNet(
          vccNet,
          powerState,
          sourceVoltages,
        );

      const gnd =
        voltageForNet(
          gndNet,
          powerState,
          sourceVoltages,
        );

      if (
        typeof vcc !== "number" ||
        typeof gnd !== "number"
      ) {
        continue;
      }

      const position =
        readPotentiometerPosition(node);

      const signalVoltage =
        gnd +
        (vcc - gnd) * position;

      if (sigNet) {
        netVoltages.set(
          sigNet,
          clamp(signalVoltage, 0, 5),
        );
      }
    }

    /*
     * =========================================================
     * LDR / PHOTORESISTOR SENSOR
     * =========================================================
     *
     * Wokwi's photoresistor module is:
     *
     *   VCC
     *    |
     *   LDR
     *    |
     *   AO
     *    |
     *   10K
     *    |
     *   GND
     *
     * R_LDR = RL10 * 1000 * 10^gamma / lux^gamma
     *
     * AO = GND + (VCC-GND) * R_LDR/(R_LDR+10K)
     *
     * DO is HIGH in darkness and LOW in light:
     *
     *   AO >= threshold -> HIGH
     *   AO <  threshold -> LOW
     *
     * Defaults match Wokwi:
     *   lux=500, rl10=50kΩ, gamma=0.7, threshold=2.5V.
     */
    for (const component of netlist.components) {
      if (
        component.type !== "ldr" &&
        component.type !== "photoresistor" &&
        component.type !==
          "wokwi-photoresistor-sensor"
      ) {
        continue;
      }

      const node =
        nodes.find(
          (candidate) =>
            candidate.id === component.id,
        );

      if (!node) {
        continue;
      }

      const vccNet =
        component.terminals.VCC ?? null;

      const gndNet =
        component.terminals.GND ?? null;

      const aoNet =
        component.terminals.AO ?? null;

      const doNet =
        component.terminals.DO ?? null;

      const vcc =
        voltageForNet(
          vccNet,
          powerState,
          sourceVoltages,
        );

      const gnd =
        voltageForNet(
          gndNet,
          powerState,
          sourceVoltages,
        );

      /*
       * A powered sensor needs both rails. If the module is not
       * powered, don't invent an AO voltage or DO logic level.
       */
      if (
        typeof vcc !== "number" ||
        typeof gnd !== "number"
      ) {
        continue;
      }

      const lux =
        readLdrLux(node);

      const rl10K =
        readLdrRl10(node);

      const gamma =
        readLdrGamma(node);

      const threshold =
        readLdrThreshold(node);

      const resistanceOhms =
        rl10K *
        1000 *
        Math.pow(10, gamma) /
        Math.pow(lux, gamma);

      const fixedResistorOhms =
        10_000;

      const aoVoltage =
        gnd +
        (vcc - gnd) *
          (
            resistanceOhms /
            (
              resistanceOhms +
              fixedResistorOhms
            )
          );

      const clampedAo =
        clamp(aoVoltage, 0, 5);

      /*
       * Wokwi photoresistor DO:
       * dark -> HIGH
       * light -> LOW
       */
      const doLevel: 0 | 1 =
        clampedAo >= threshold
          ? 1
          : 0;

      if (aoNet) {
        netVoltages.set(
          aoNet,
          clampedAo,
        );
      }

      if (doNet) {
        digitalOutputs.set(
          doNet,
          doLevel,
        );
      }

      sensorVoltages.set(
        component.id,
        clampedAo,
      );

      sensorResistanceOhms.set(
        component.id,
        resistanceOhms,
      );
    }

    /*
     * Expose direct Arduino analog-pin voltages.
     *
     * The AVR bridge later turns these voltages into the
     * ATmega328P 10-bit ADC input used by analogRead().
     */
    const pinVoltages =
      new Map<string, number>();

    const pinValues =
      new Map<string, number>();

    for (const board of arduinoBoards) {
      for (
        let channel = 0;
        channel <= 5;
        channel += 1
      ) {
        const pinName =
          "A" + channel;

        const netId =
          netlist.pinToNet.get(
            board.id + ":" + pinName,
          );

        if (!netId) {
          continue;
        }

        const voltage =
          netVoltages.get(netId);

        if (
          typeof voltage !== "number"
        ) {
          continue;
        }

        const clampedVoltage =
          clamp(voltage, 0, 5);

        const adcValue =
          Math.round(
            (clampedVoltage / 5) * 1023,
          );

        pinVoltages.set(
          pinName,
          clampedVoltage,
        );

        pinValues.set(
          pinName,
          adcValue,
        );
      }
    }

    /*
     * Detect invalid analog values rather than silently passing
     * them into the AVR bridge.
     */
    for (const [
      netId,
      voltage,
    ] of netVoltages) {
      if (
        voltage < 0 ||
        voltage > 5 ||
        !Number.isFinite(voltage)
      ) {
        conflicts.push(
          "ANALOG_VOLTAGE_OUT_OF_RANGE:" +
            netId,
        );
      }
    }

    return {
      pinVoltages,
      pinValues,
      digitalOutputs,
      sensorVoltages,
      sensorResistanceOhms,
      conflicts,
    };
  }
}
