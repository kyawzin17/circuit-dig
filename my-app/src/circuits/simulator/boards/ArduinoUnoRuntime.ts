<<<<<<< HEAD
import type {
  ArduinoUnoRuntimeState,
  RuntimePin,
  PinLevel,
  PinMode,
} from "../types/simulator.types";
=======
import type { ArduinoUnoRuntimeState, PinLevel, PinMode, RuntimePin } from "../types/simulator.types";
import { ARDUINO_UNO_PIN_MAP } from "../mapping/ArduinoUnoPinMap";
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346

export type ArduinoPort = "B" | "C" | "D";

<<<<<<< HEAD
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
=======
export type ArduinoDigitalDriver = {
  pin: string;
  level: PinLevel;
  mode: PinMode;
};

export class ArduinoUnoRuntime {
  private state: ArduinoUnoRuntimeState = this.createInitialState();

  private createInitialState(): ArduinoUnoRuntimeState {
    const digitalPins: Record<number, RuntimePin> = {};
    for (let pin = 0; pin <= 13; pin += 1) {
      digitalPins[pin] = { pin, mode: "input", level: 0 };
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
    }
    return { digitalPins, ledStates: {}, resistorStates: {} };
  }

<<<<<<< HEAD
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
=======
  getState(): ArduinoUnoRuntimeState { return this.state; }

  setPinMode(pin: number, mode: PinMode): void {
    const runtimePin = this.state.digitalPins[pin];
    if (runtimePin) runtimePin.mode = mode;
  }

  digitalWrite(pin: number, level: PinLevel): void {
    const runtimePin = this.state.digitalPins[pin];
    if (runtimePin) runtimePin.level = level;
  }

  digitalRead(pin: number): PinLevel {
    return this.state.digitalPins[pin]?.level ?? 0;
  }

  getDigitalDrivers(): ArduinoDigitalDriver[] {
    const drivers: ArduinoDigitalDriver[] = [];
    for (const [pinText, runtimePin] of Object.entries(this.state.digitalPins)) {
      if (runtimePin.mode !== "output") continue;
      const pinName = `D${Number(pinText)}`;
      if (!ARDUINO_UNO_PIN_MAP[pinName]) continue;
      drivers.push({ pin: pinName, level: runtimePin.level, mode: runtimePin.mode });
    }
    return drivers;
  }

  applyPortRegister(port: ArduinoPort, ddr: number, output: number): void {
    for (const [pinName, mapping] of Object.entries(ARDUINO_UNO_PIN_MAP)) {
      if (mapping.port !== port || !pinName.startsWith("D")) continue;
      const pin = Number(pinName.slice(1));
      const mode: PinMode = (ddr & (1 << mapping.bit)) !== 0 ? "output" : "input";
      this.setPinMode(pin, mode);
      if (mode === "output") {
        this.digitalWrite(pin, (output & (1 << mapping.bit)) !== 0 ? 1 : 0);
      }
    }
  }

  reset(): void { this.state = this.createInitialState(); }
}
>>>>>>> d89bf2da2c3b6dcbfb1c8a9b097ea377ca6a8346
