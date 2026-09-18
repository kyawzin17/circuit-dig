import type { ArduinoUnoRuntimeState, PinLevel, PinMode, RuntimePin } from "../types/simulator.types";
import { ARDUINO_UNO_PIN_MAP } from "../mapping/ArduinoUnoPinMap";
export type ArduinoPort = "B" | "C" | "D";

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
      digitalPins[pin] = { pin, mode: "input", level: 0 };    }
    return { digitalPins, ledStates: {}, resistorStates: {} };
  }

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