import type {
  ArduinoUnoRuntimeState,
  RuntimePin,
} from "../types/simulator.types";

import {
  ARDUINO_UNO_PIN_MAP,
} from "../mapping/ArduinoUnoPinMap";

// =====================================================
// ARDUINO UNO RUNTIME
// =====================================================

export class ArduinoUnoRuntime {

  private state: ArduinoUnoRuntimeState;

  constructor() {
    this.state =
      this.createInitialState();
  }

  // ===================================================
  // INITIAL STATE
  // ===================================================

  private createInitialState():
    ArduinoUnoRuntimeState {

    const digitalPins:
      Record<number, RuntimePin> = {};

    // -------------------------------------------------
    // DIGITAL PINS
    // -------------------------------------------------

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

  // ===================================================
  // GET STATE
  // ===================================================

  getState():
    ArduinoUnoRuntimeState {

    return this.state;
  }

  // ===================================================
  // SET PIN MODE
  // ===================================================

  setPinMode(
    pin: number,
    mode:
      | "input"
      | "output"
      | "input_pullup"
  ): void {

    const runtimePin =
      this.state.digitalPins[pin];

    if (!runtimePin) {
      return;
    }

    runtimePin.mode = mode;
  }

  // ===================================================
  // WRITE DIGITAL PIN
  // ===================================================

  digitalWrite(
    pin: number,
    level: 0 | 1
  ): void {

    const runtimePin =
      this.state.digitalPins[pin];

    if (!runtimePin) {
      return;
    }

    runtimePin.level =
      level;
  }

  // ===================================================
  // READ DIGITAL PIN
  // ===================================================

  digitalRead(
    pin: number
  ): 0 | 1 {

    const runtimePin =
      this.state.digitalPins[pin];

    if (!runtimePin) {
      return 0;
    }

    return runtimePin.level;
  }

  // ===================================================
  // RESET
  // ===================================================

  reset(): void {

    this.state =
      this.createInitialState();
  }
}