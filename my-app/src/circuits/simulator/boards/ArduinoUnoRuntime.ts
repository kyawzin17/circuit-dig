import type {
  ArduinoUnoRuntimeState,
  PinLevel,
  PinMode,
  RuntimePin,
  ArduinoPowerRailName,
  ArduinoPowerRailState,
  ArduinoPowerPinVoltage,
} from "../types/simulator.types";
import { ARDUINO_UNO_PIN_MAP } from "../mapping/ArduinoUnoPinMap";

export type ArduinoPort = "B" | "C" | "D";

export type ArduinoDigitalDriver = {
  pin: string;
  level: PinLevel;
  mode: PinMode;
  /**
   * 0..1 duty cycle when this GPIO is being driven by
   * the AVR hardware PWM peripheral.
   */
  pwmDuty?: number;
};

export type ArduinoPowerDriver = {
  pin: string;
  voltage: number;
  rail: ArduinoPowerRailName;
  kind: "source" | "ground";
};

export class ArduinoUnoRuntime {
  private state: ArduinoUnoRuntimeState =
    this.createInitialState();

  private createInitialState(): ArduinoUnoRuntimeState {
    const digitalPins: Record<number, RuntimePin> = {};

    for (let pin = 0; pin <= 13; pin += 1) {
      digitalPins[pin] = {
        pin,
        mode: "input",
        level: 0,
      };
    }

    const powerRails: Record<
      ArduinoPowerRailName,
      ArduinoPowerRailState
    > = {
      "5V": {
        name: "5V",
        voltage: 5,
        enabled: true,
        direction: "source",
      },
      "3.3V": {
        name: "3.3V",
        voltage: 3.3,
        enabled: true,
        direction: "source",
        maxCurrentMa: 50,
      },
      IOREF: {
        name: "IOREF",
        voltage: 5,
        enabled: true,
        direction: "reference",
      },
      GND: {
        name: "GND",
        voltage: 0,
        enabled: true,
        direction: "ground",
      },
      VIN: {
        name: "VIN",
        voltage: 0,
        enabled: false,
        direction: "input",
      },
    };

    const pinVoltages: Record<
      string,
      ArduinoPowerPinVoltage
    > = {
      "5V": {
        pin: "5V",
        voltage: 5,
        rail: "5V",
      },
      "3.3V": {
        pin: "3.3V",
        voltage: 3.3,
        rail: "3.3V",
      },
      IOREF: {
        pin: "IOREF",
        voltage: 5,
        rail: "IOREF",
      },
      GND1: {
        pin: "GND1",
        voltage: 0,
        rail: "GND",
      },
      GND2: {
        pin: "GND2",
        voltage: 0,
        rail: "GND",
      },
      GND3: {
        pin: "GND3",
        voltage: 0,
        rail: "GND",
      },
      AREF: {
        pin: "AREF",
        voltage: 5,
        rail: "IOREF",
      },
    };

    return {
      digitalPins,
      powerRails,
      pinVoltages,
      ledStates: {},
      resistorStates: {},
      wireStates: {},
    };
  }

  getState(): ArduinoUnoRuntimeState {
    return this.state;
  }

  setPinMode(pin: number, mode: PinMode): void {
    const runtimePin = this.state.digitalPins[pin];

    if (runtimePin) {
      runtimePin.mode = mode;
    }
  }

  digitalWrite(pin: number, level: PinLevel): void {
    const runtimePin = this.state.digitalPins[pin];

    if (runtimePin) {
      runtimePin.level = level;
      runtimePin.pwmDuty = undefined;
    }
  }

  setPwmDuty(
    pin: number,
    duty: number,
  ): void {
    const runtimePin = this.state.digitalPins[pin];

    if (!runtimePin) {
      return;
    }

    runtimePin.pwmDuty = Math.max(
      0,
      Math.min(1, duty),
    );

    runtimePin.mode = "output";

    if (runtimePin.pwmDuty <= 0) {
      runtimePin.level = 0;
    } else if (runtimePin.pwmDuty >= 1) {
      runtimePin.level = 1;
    }
  }

  getPwmDuty(
    pin: number,
  ): number | undefined {
    return this.state.digitalPins[pin]?.pwmDuty;
  }

  digitalRead(pin: number): PinLevel {
    return this.state.digitalPins[pin]?.level ?? 0;
  }

  getPowerDrivers(): ArduinoPowerDriver[] {
    const drivers: ArduinoPowerDriver[] = [];

    const sourceRails: Array<{
      pin: string;
      rail: ArduinoPowerRailName;
      kind: "source" | "ground";
    }> = [
      {
        pin: "5V",
        rail: "5V",
        kind: "source",
      },
      {
        pin: "3.3V",
        rail: "3.3V",
        kind: "source",
      },
      {
        pin: "IOREF",
        rail: "IOREF",
        kind: "source",
      },
      {
        pin: "GND1",
        rail: "GND",
        kind: "ground",
      },
      {
        pin: "GND2",
        rail: "GND",
        kind: "ground",
      },
      {
        pin: "GND3",
        rail: "GND",
        kind: "ground",
      },
    ];

    for (const item of sourceRails) {
      const rail = this.state.powerRails[item.rail];

      if (!rail?.enabled) {
        continue;
      }

      drivers.push({
        pin: item.pin,
        voltage: rail.voltage,
        rail: item.rail,
        kind: item.kind,
      });
    }

    return drivers;
  }

  getPowerPinVoltage(
    pin: string,
  ): number | undefined {
    return this.state.pinVoltages[pin]?.voltage;
  }

  getDigitalDrivers(): ArduinoDigitalDriver[] {
    const drivers: ArduinoDigitalDriver[] = [];

    for (const [pinText, runtimePin] of Object.entries(
      this.state.digitalPins,
    )) {
      if (runtimePin.mode !== "output") {
        continue;
      }

      const pinName = "D" + Number(pinText);

      if (!ARDUINO_UNO_PIN_MAP[pinName]) {
        continue;
      }

      drivers.push({
        pin: pinName,
        level: runtimePin.level,
        mode: runtimePin.mode,
        pwmDuty: runtimePin.pwmDuty,
      });
    }

    return drivers;
  }

  applyPortRegister(
    port: ArduinoPort,
    ddr: number,
    output: number,
  ): void {
    for (const [pinName, mapping] of Object.entries(
      ARDUINO_UNO_PIN_MAP,
    )) {
      if (
        mapping.port !== port ||
        !pinName.startsWith("D")
      ) {
        continue;
      }

      const pin = Number(pinName.slice(1));

      const mode: PinMode =
        (ddr & (1 << mapping.bit)) !== 0
          ? "output"
          : "input";

      this.setPinMode(pin, mode);

      if (mode === "input") {
        const runtimePin = this.state.digitalPins[pin];
        if (runtimePin) {
          runtimePin.pwmDuty = undefined;
        }
      }

      if (mode === "output") {
        this.digitalWrite(
          pin,
          (output & (1 << mapping.bit)) !== 0
            ? 1
            : 0,
        );
      }
    }
  }

  reset(): void {
    this.state = this.createInitialState();
  }
}
