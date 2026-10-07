import type {
  ArduinoUnoRuntimeState,
  PinLevel,
  PinMode,
  RuntimePin,
  ArduinoPowerRailName,
  ArduinoPowerRailState,
  ArduinoPowerPinVoltage,
  SevenSegmentRuntimeState,
  BuzzerRuntimeState,
  UltrasonicRuntimeState,
  ServoRuntimeState,
  Lcd1602RuntimeState,
  Ssd1306RuntimeState,
  NeoPixelRuntimeState,
  PirRuntimeState,
  Ds1307RuntimeState,
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

    // D0..D13 = 0..13, A0..A5 = 14..19.
    // The ATmega328P exposes A0..A5 as the PORTC GPIO pins too.
    for (let pin = 0; pin <= 19; pin += 1) {
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
      /*
       * AREF is the ADC reference pin, not a 5V power output.
       * In the default AVcc reference mode the ADC uses the MCU's
       * internal AVcc reference, while the physical AREF pin is not
       * a source. Keep it at 0V here so the power solver cannot
       * accidentally power a circuit through AREF.
       */
      AREF: {
        pin: "AREF",
        voltage: 0,
        rail: "IOREF",
      },
    };

    return {
      digitalPins,
      powerRails,
      pinVoltages,
      analogPinVoltages: {},
      analogPinValues: {},
      ledStates: {},
      arduinoBoard: {
        led13: false,
        ledRX: false,
        ledTX: false,
        ledPower: false,
        resetPressed: false,
      },
      resistorStates: {},
      sevenSegmentStates: {} as Record<string, SevenSegmentRuntimeState>,
      buzzerStates: {} as Record<string, BuzzerRuntimeState>,
      ultrasonicStates: {} as Record<string, UltrasonicRuntimeState>,
      servoStates: {} as Record<string, ServoRuntimeState>,
      pirStates: {} as Record<string, PirRuntimeState>,
      lcdStates: {} as Record<string, Lcd1602RuntimeState>,
      ssd1306States: {} as Record<string, Ssd1306RuntimeState>,
      neopixelStates: {} as Record<string, NeoPixelRuntimeState>,
      ds1307States: {} as Record<string, Ds1307RuntimeState>,
      serialOutput: "",
      wireStates: {},
      diagnostics: {
        simulatedCycles: 0,
        simulatedMs: 0,
        frameCount: 0,
        pins: [],
        nets: [],
        components: [],
        faults: [],
      },
    };
  }

  getState(): ArduinoUnoRuntimeState {
    return this.state;
  }

  /** Append bytes received from the emulated ATmega328P UART TX register. */
  appendSerialOutput(value: number): void {
    const byte = value & 0xff;
    if (byte === 0) return;

    this.state.serialOutput = (
      this.state.serialOutput + String.fromCharCode(byte)
    ).slice(-50000);
  }

  clearSerialOutput(): void {
    this.state.serialOutput = "";
  }

  markTxActivity(): void {
    this.state.arduinoBoard.ledTX = true;
  }

  markRxActivity(): void {
    this.state.arduinoBoard.ledRX = true;
  }

  beginFrame(): void {
    this.state.arduinoBoard.ledTX = false;
    this.state.arduinoBoard.ledRX = false;
    this.state.arduinoBoard.ledPower = true;
  }

  syncBoardLeds(): void {
    this.state.arduinoBoard.ledPower = true;
    this.state.arduinoBoard.led13 =
      this.state.digitalPins[13]?.level === 1 &&
      this.state.digitalPins[13]?.mode === "output";
  }

  setAnalogInput(
    pin: string,
    voltage: number,
    value: number,
  ): void {
    this.state.analogPinVoltages[pin] = voltage;
    this.state.analogPinValues[pin] = value;
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

  setInputLevel(
    pin: number,
    level: PinLevel,
  ): void {
    const runtimePin =
      this.state.digitalPins[pin];

    if (
      runtimePin &&
      runtimePin.mode !== "output"
    ) {
      runtimePin.level = level;
    }
  }

  getDigitalInputModes(): Map<string, PinMode> {
    const modes = new Map<string, PinMode>();

    for (let pin = 0; pin <= 13; pin += 1) {
      modes.set(
        "D" + pin,
        this.state.digitalPins[pin]?.mode ??
          "input",
      );
    }

    for (let channel = 0; channel <= 5; channel += 1) {
      const runtimePin = 14 + channel;

      modes.set(
        "A" + channel,
        this.state.digitalPins[runtimePin]?.mode ??
          "input",
      );
    }

    return modes;
  }

  /**
   * Arduino UNO R3 board constants.
   *
   * These are the ATmega328P/UNO values used by the real board
   * configuration and are intentionally exposed to the electrical
   * simulator instead of being hard-coded in UI code.
   */
  getClockFrequencyHz(): number {
    return 16_000_000;
  }

  getLogicHighVoltage(): number {
    return 5;
  }

  getPwmPins(): string[] {
    return ["D3", "D5", "D6", "D9", "D10", "D11"];
  }

  getPwmFrequencyHz(pin: string): number | undefined {
    /*
     * Arduino AVR core default timer configuration on a 16 MHz UNO R3:
     *
     *   D3/D11  -> Timer2 phase-correct 8-bit PWM  ~490.20 Hz
     *   D5/D6   -> Timer0 fast 8-bit PWM          ~976.56 Hz
     *   D9/D10  -> Timer1 phase-correct 8-bit PWM  ~490.20 Hz
     *
     * Do not collapse all PWM pins into one frequency. Applications
     * such as tone generation, servo timing and frequency-sensitive
     * peripherals depend on timer-specific behavior.
     */
    switch (pin) {
      case "D3":
      case "D11":
      case "D9":
      case "D10":
        return 16_000_000 / (64 * 510);

      case "D5":
      case "D6":
        return 16_000_000 / (64 * 256);

      default:
        return undefined;
    }
  }

  getDigitalPinVoltage(pin: string): number | undefined {
    const numericPin =
      /^D\d+$/.test(pin)
        ? Number(pin.slice(1))
        : /^A\d+$/.test(pin)
          ? 14 + Number(pin.slice(1))
          : NaN;

    if (!Number.isFinite(numericPin)) {
      return undefined;
    }

    const runtimePin =
      this.state.digitalPins[numericPin];

    if (!runtimePin) {
      return undefined;
    }

    if (runtimePin.mode === "output") {
      if (runtimePin.pwmDuty !== undefined) {
        return this.getLogicHighVoltage() *
          runtimePin.pwmDuty;
      }

      return runtimePin.level === 1
        ? this.getLogicHighVoltage()
        : 0;
    }

    return runtimePin.level === 1
      ? this.getLogicHighVoltage()
      : 0;
  }

  getAnalogInput(
    pin: string,
  ): {
    voltage: number;
    value: number;
  } | undefined {
    const voltage =
      this.state.analogPinVoltages[pin];

    const value =
      this.state.analogPinValues[pin];

    if (
      typeof voltage !== "number" ||
      typeof value !== "number"
    ) {
      return undefined;
    }

    return {
      voltage,
      value,
    };
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

      const numericPin = Number(pinText);
      const pinName =
        numericPin <= 13
          ? "D" + numericPin
          : "A" + (numericPin - 14);

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
      if (mapping.port !== port) {
        continue;
      }

      /*
       * Runtime numeric IDs:
       *   D0..D13 -> 0..13
       *   A0..A5  -> 14..19
       *
       * This mirrors the Arduino core's ability to use analog pins
       * as ordinary GPIO pins (D14..D19).
       */
      const pin = pinName.startsWith("A")
        ? 14 + Number(pinName.slice(1))
        : Number(pinName.slice(1));

      const isOutput =
        (ddr & (1 << mapping.bit)) !== 0;

      /*
       * ATmega328P GPIO mode is determined by both DDRx and PORTx:
       *
       * DDRx = 1                  -> OUTPUT
       * DDRx = 0, PORTx = 1       -> INPUT_PULLUP
       * DDRx = 0, PORTx = 0       -> INPUT
       *
       * The previous implementation only looked at DDRx, which
       * meant Arduino's INPUT_PULLUP was silently downgraded to
       * INPUT. That made an unpressed pushbutton read LOW and
       * therefore made digitalRead() appear broken.
       */
      const mode: PinMode =
        isOutput
          ? "output"
          : (output & (1 << mapping.bit)) !== 0
            ? "input_pullup"
            : "input";

      this.setPinMode(pin, mode);

      if (!isOutput) {
        const runtimePin =
          this.state.digitalPins[pin];

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
