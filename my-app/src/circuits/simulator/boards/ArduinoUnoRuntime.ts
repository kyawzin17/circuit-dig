import type {
  ArduinoUnoRuntimeState,
  RuntimePin,
  PinLevel,
  PinMode,
} from "../types/simulator.types";

import {
  ARDUINO_UNO_PIN_MAP,
} from "../mapping/ArduinoUnoPinMap";

import type {
  CircuitPinRef,
} from "../circuit/CircuitGraph";

import type {
  DigitalDriver,
} from "../electrical/DigitalNetSolver";

/* =========================================================
   ARDUINO UNO RUNTIME
========================================================= */

export class ArduinoUnoRuntime {
  private state: ArduinoUnoRuntimeState;

  constructor() {
    this.state =
      this.createInitialState();
  }

  /* =======================================================
     INITIAL STATE
  ======================================================= */

  private createInitialState():
    ArduinoUnoRuntimeState {
    const digitalPins:
      Record<number, RuntimePin> = {};

    for (
      let pin = 0;
      pin <= 13;
      pin++
    ) {
      digitalPins[pin] = {
        pin,
        mode: "input",
        level: 0,
      };
    }

    return {
      digitalPins,

      ledStates: {},

      resistorStates: {},
    };
  }

  /* =======================================================
     STATE
  ======================================================= */

  getState():
    ArduinoUnoRuntimeState {
    return this.state;
  }

  /* =======================================================
     PIN MODE
  ======================================================= */

  setPinMode(
    pin: number,
    mode: PinMode,
  ): void {
    const runtimePin =
      this.state.digitalPins[pin];

    if (!runtimePin) {
      return;
    }

    runtimePin.mode =
      mode;
  }

  /* =======================================================
     DIGITAL WRITE
  ======================================================= */

  digitalWrite(
    pin: number,
    level: PinLevel,
  ): void {
    const runtimePin =
      this.state.digitalPins[pin];

    if (!runtimePin) {
      return;
    }

    /*
     * Writing to an INPUT pin does not
     * change the actual driven electrical
     * state in our model.
     *
     * Arduino INPUT_PULLUP is handled
     * separately later.
     */
    if (
      runtimePin.mode !== "output"
    ) {
      return;
    }

    runtimePin.level =
      level;
  }

  /* =======================================================
     DIGITAL READ
  ======================================================= */

  digitalRead(
    pin: number,
  ): PinLevel {
    const runtimePin =
      this.state.digitalPins[pin];

    if (!runtimePin) {
      return 0;
    }

    return runtimePin.level;
  }

  /* =======================================================
     GET DRIVER
  ======================================================= */

  getDigitalDrivers(
    nodeId: string,
  ): DigitalDriver[] {
    const drivers:
      DigitalDriver[] = [];

    for (
      let pin = 0;
      pin <= 13;
      pin++
    ) {
      const runtimePin =
        this.state.digitalPins[pin];

      if (!runtimePin) {
        continue;
      }

      if (
        runtimePin.mode !== "output"
      ) {
        continue;
      }

      const pinMap =
        ARDUINO_UNO_PIN_MAP[
          pin
        ];

      if (!pinMap) {
        continue;
      }

      drivers.push({
        pin: {
          nodeId,

          /*
           * Important:
           *
           * This MUST match the
           * handle/pin id used by
           * arduinoUnoPins.ts
           */
          pinId:
            this.resolveCircuitPinId(
              pin,
            ),
        },

        mode:
          runtimePin.mode,

        level:
          runtimePin.level,
      });
    }

    return drivers;
  }

  /* =======================================================
     CIRCUIT PIN ID
  ======================================================= */

  private resolveCircuitPinId(
    pin: number,
  ): string {
    return `D${pin}`;
  }

  /* =======================================================
     LED STATE
  ======================================================= */

  setLedState(
    id: string,
    isOn: boolean,
    brightness = 1,
  ): void {
    this.state.ledStates[id] = {
      id,

      isOn,

      brightness,
    };
  }

  /* =======================================================
     RESET
  ======================================================= */

  reset(): void {
    this.state =
      this.createInitialState();
  }
}