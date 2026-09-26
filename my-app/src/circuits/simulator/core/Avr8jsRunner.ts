import {
  avrInstruction,
  AVRTimer,
  CPU,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRTWI,
  twiConfig,
  type TWIEventHandler,
} from "avr8js";

import type { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";

const PINB = 0x23;
const DDRB = 0x24;
const PORTB = 0x25;

const PINC = 0x26;
const DDRC = 0x27;
const PORTC = 0x28;

const PIND = 0x29;
const DDRD = 0x2a;
const PORTD = 0x2b;

// ATmega328P ADC registers.
const ADCL = 0x78;
const ADCH = 0x79;
const ADCSRA = 0x7a;
const ADMUX = 0x7c;

// ATmega328P timer/PWM registers.
const TCCR0A = 0x44;
const OCR0A = 0x47;
const OCR0B = 0x48;

const TCCR1A = 0x80;
const OCR1AL = 0x88;
const OCR1AH = 0x89;
const OCR1BL = 0x8a;
const OCR1BH = 0x8b;

const TCCR2A = 0xb0;
const OCR2A = 0xb3;
const OCR2B = 0xb4;

export interface AvrGpioChange {
  pin: string;
  level: 0 | 1;
  cycle: number;
}

type ScheduledDigitalPulse = {
  pin: string;
  startCycle: number;
  endCycle: number;
};

/**
 * AVR8JS runner for the ATmega328P used by Arduino UNO.
 *
 * Important:
 * - Arduino C++ is compiled to AVR machine code by arduino-cli.
 * - avrInstruction() executes the actual AVR instruction.
 * - cpu.tick() advances AVR clock events/interrupt handling.
 * - Timer0 is required by Arduino's delay()/millis() implementation.
 * - Timer1/Timer2 are initialized now so PWM/servo features can build on
 *   the same CPU runtime later.
 */
export class Avr8jsRunner {
  private cpu: CPU | null = null;
  private program: Uint16Array | null = null;
  private arduino: ArduinoUnoRuntime | null = null;
  private analogInputs: Record<string, number> = {};
  private externalDigitalInputs: Record<string, 0 | 1> = {};
  private scheduledDigitalPulses: ScheduledDigitalPulse[] = [];
  private toggleCounts: Record<string, number> = {};

  private timer0: AVRTimer | null = null;
  private timer1: AVRTimer | null = null;
  private timer2: AVRTimer | null = null;
  private twi: AVRTWI | null = null;

  loadProgram(
    program: Uint16Array,
    arduino?: ArduinoUnoRuntime
  ): void {
    this.program = program;
    this.cpu = new CPU(program);
    this.arduino = arduino ?? null;
    this.externalDigitalInputs = {};
    this.scheduledDigitalPulses = [];
    this.toggleCounts = {};

    // Arduino UNO's Timer0 drives millis()/micros()/delay().
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.twi = new AVRTWI(
      this.cpu,
      twiConfig,
      16_000_000,
    );

    this.syncGpioToRuntime();
  }

  getCPU(): CPU | null {
    return this.cpu;
  }

  setTwiEventHandler(
    handler: TWIEventHandler | null,
  ): void {
    if (this.twi) {
      this.twi.eventHandler =
        handler ??
        this.twi.eventHandler;
    }
  }

  getTwi(): AVRTWI | null {
    return this.twi;
  }

  /**
   * Read the actual ATmega328P GPIO level at the current CPU cycle.
   * LCD parallel timing uses this at the E falling edge so the LCD
   * sees the same firmware-generated bus values as the real MCU.
   */
  getGpioLevel(pin: string): 0 | 1 {
    if (!this.cpu) {
      return 0;
    }

    const match = pin.match(/^(D|A)(\\d+)$/i);
    if (!match) {
      return 0;
    }

    const prefix = match[1].toUpperCase();
    const channel = Number(match[2]);

    let port: number;
    let ddr: number;
    let bit: number;

    if (prefix === "D" && channel >= 0 && channel <= 7) {
      port = PORTD;
      ddr = DDRD;
      bit = channel;
    } else if (prefix === "D" && channel >= 8 && channel <= 13) {
      port = PORTB;
      ddr = DDRB;
      bit = channel - 8;
    } else if (prefix === "A" && channel >= 0 && channel <= 5) {
      port = PORTC;
      ddr = DDRC;
      bit = channel;
    } else {
      return 0;
    }

    const isOutput =
      (this.cpu.data[ddr] & (1 << bit)) !== 0;

    const register =
      isOutput ? port : (
        prefix === "D" && channel <= 7
          ? PIND
          : prefix === "D"
            ? PINB
            : PINC
      );

    return (this.cpu.data[register] & (1 << bit)) !== 0
      ? 1
      : 0;
  }

  getProgram(): Uint16Array | null {
    return this.program;
  }

  /**
   * Execute approximately `cycles` CPU cycles.
   *
   * We use CPU.cycles as the source of truth rather than assuming one
   * instruction equals one cycle because AVR instructions have different
   * cycle counts.
   */
  /**
   * Inject the external electrical state into the AVR PINx
   * registers before executing firmware.
   *
   * The Arduino core's digitalRead() eventually reads PINB/PINC/PIND.
   * We therefore feed the resolved circuit level into the same AVR
   * input registers instead of calling digitalRead() from JavaScript.
   */
  setExternalDigitalInputs(
    levels: Record<string, 0 | 1>,
  ): void {
    if (!this.cpu) {
      return;
    }

    this.cpu.data[PINB] =
      this.composeInputRegister(
        DDRB,
        PORTB,
        levels,
        "B",
      );

    this.cpu.data[PINC] =
      this.composeInputRegister(
        DDRC,
        PORTC,
        levels,
        "C",
      );

    this.cpu.data[PIND] =
      this.composeInputRegister(
        DDRD,
        PORTD,
        levels,
        "D",
      );

    this.externalDigitalInputs = { ...levels };
    this.applyScheduledDigitalPulses();
  }

  /**
   * Set one external digital input without rebuilding every input
   * register. Used by time-aware peripherals such as HC-SR04.
   */
  setExternalDigitalInput(
    pin: string,
    level: 0 | 1,
  ): void {
    this.externalDigitalInputs[pin] = level;
    this.writeExternalDigitalInput(pin, level);
  }

  /**
   * Schedule an external HIGH pulse for an exact AVR-cycle duration.
   * This keeps peripherals such as HC-SR04 accurate enough for
   * pulseIn(), while still executing the user's real AVR firmware.
   */
  scheduleDigitalPulse(
    pin: string,
    startCycle: number,
    durationCycles: number,
  ): void {
    const duration = Math.max(
      1,
      Math.floor(durationCycles),
    );

    this.scheduledDigitalPulses.push({
      pin,
      startCycle,
      endCycle: startCycle + duration,
    });

    this.applyScheduledDigitalPulses();
  }

  getToggleCount(pin: string): number {
    return this.toggleCounts[pin] ?? 0;
  }

  getToggleFrequencyHz(
    pin: string,
    elapsedCycles: number,
  ): number | undefined {
    const toggles = this.getToggleCount(pin);

    if (toggles < 2 || elapsedCycles <= 0) {
      return undefined;
    }

    const elapsedSeconds =
      elapsedCycles / 16_000_000;

    return toggles / 2 / elapsedSeconds;
  }

  setExternalAnalogInputs(
    voltages: Record<string, number>,
  ): void {
    this.analogInputs = {
      ...voltages,
    };
  }

  runCycles(
    cycles: number,
    onGpioChange?: (
      change: AvrGpioChange,
    ) => void,
  ): void {
    if (!this.cpu) {
      throw new Error("AVR program has not been loaded.");
    }

    const count = Math.max(0, Math.floor(cycles));
    const targetCycles = this.cpu.cycles + count;

    this.toggleCounts = {};

    while (this.cpu.cycles < targetCycles) {
      const beforeB =
        (this.cpu.data[PORTB] ?? 0) &
        (this.cpu.data[DDRB] ?? 0);
      const beforeC =
        (this.cpu.data[PORTC] ?? 0) &
        (this.cpu.data[DDRC] ?? 0);
      const beforeD =
        (this.cpu.data[PORTD] ?? 0) &
        (this.cpu.data[DDRD] ?? 0);

      avrInstruction(this.cpu);
      this.cpu.tick();

      /*
       * Arduino's analogRead() starts a real AVR ADC conversion by
       * setting ADCSRA.ADSC, then waits until the hardware clears
       * ADSC before reading ADCL/ADCH.
       *
       * The simulator resolves the external voltage electrically,
       * then completes that same register transaction here. This
       * keeps analogRead() firmware-driven instead of replacing it
       * with a JavaScript function call.
       */
      this.serviceAdc();

      const afterB =
        (this.cpu.data[PORTB] ?? 0) &
        (this.cpu.data[DDRB] ?? 0);
      const afterC =
        (this.cpu.data[PORTC] ?? 0) &
        (this.cpu.data[DDRC] ?? 0);
      const afterD =
        (this.cpu.data[PORTD] ?? 0) &
        (this.cpu.data[DDRD] ?? 0);

      this.recordPortChanges(
        "B",
        beforeB ^ afterB,
        afterB,
        onGpioChange,
      );
      this.recordPortChanges(
        "C",
        beforeC ^ afterC,
        afterC,
        onGpioChange,
      );
      this.recordPortChanges(
        "D",
        beforeD ^ afterD,
        afterD,
        onGpioChange,
      );

      this.applyScheduledDigitalPulses();
    }

    this.syncGpioToRuntime();
  }

  private serviceAdc(): void {
    if (!this.cpu) {
      return;
    }

    const data = this.cpu.data;
    const adcsra = data[ADCSRA] ?? 0;

    const adcEnabled =
      (adcsra & (1 << 7)) !== 0;
    const conversionStarted =
      (adcsra & (1 << 6)) !== 0;

    if (!adcEnabled || !conversionStarted) {
      return;
    }

    const admux = data[ADMUX] ?? 0;
    const channel = admux & 0x0f;

    const pinName =
      channel >= 0 && channel <= 5
        ? "A" + channel
        : null;

    const inputVoltage =
      pinName !== null
        ? this.analogInputs[pinName] ?? 0
        : 0;

    const referenceSelect =
      (admux >> 6) & 0b11;

    const referenceVoltage =
      referenceSelect === 0b11
        ? 1.1
        : 5.0;

    const normalized =
      Math.max(
        0,
        Math.min(
          1,
          inputVoltage / referenceVoltage,
        ),
      );

    const adcValue =
      Math.round(normalized * 1023);

    const leftAdjust =
      (admux & (1 << 5)) !== 0;

    if (leftAdjust) {
      data[ADCL] =
        (adcValue & 0x03) << 6;
      data[ADCH] =
        (adcValue >> 2) & 0xff;
    } else {
      data[ADCL] =
        adcValue & 0xff;
      data[ADCH] =
        (adcValue >> 8) & 0x03;
    }

    /*
     * ADC conversion complete:
     * - clear ADSC
     * - set ADIF
     */
    data[ADCSRA] =
      (adcsra & ~(1 << 6)) |
      (1 << 4);
  }

  private recordPortChanges(
    port: "B" | "C" | "D",
    changedMask: number,
    output: number,
    onGpioChange?: (
      change: AvrGpioChange,
    ) => void,
  ): void {
    let mask = changedMask & 0xff;

    while (mask !== 0) {
      const bit =
        31 - Math.clz32(mask);

      mask &= ~(1 << bit);

      const pin =
        this.portBitToArduinoPin(
          port,
          bit,
        );

      if (!pin) {
        continue;
      }

      const level =
        (output & (1 << bit)) !== 0
          ? 1
          : 0;

      this.toggleCounts[pin] =
        (this.toggleCounts[pin] ?? 0) + 1;

      onGpioChange?.({
        pin,
        level,
        cycle: this.cpu?.cycles ?? 0,
      });
    }
  }

  private writeExternalDigitalInput(
    pin: string,
    level: 0 | 1,
  ): void {
    if (!this.cpu) {
      return;
    }

    const match = pin.match(/^(D|A)(\d+)$/i);

    if (!match) {
      return;
    }

    const prefix = match[1].toUpperCase();
    const channel = Number(match[2]);

    let address: number;
    let bit: number;

    if (prefix === "D") {
      address = PIND;
      bit = channel;
    } else {
      address = PINC;
      bit = channel;
    }

    if (bit < 0 || bit > 7) {
      return;
    }

    if (level === 1) {
      this.cpu.data[address] |= 1 << bit;
    } else {
      this.cpu.data[address] &= ~(1 << bit);
    }
  }

  private applyScheduledDigitalPulses(): void {
    if (!this.cpu) {
      return;
    }

    const cycle = this.cpu.cycles;

    for (const pin of Object.keys(this.externalDigitalInputs)) {
      this.writeExternalDigitalInput(
        pin,
        this.externalDigitalInputs[pin],
      );
    }

    const active: ScheduledDigitalPulse[] = [];

    for (const pulse of this.scheduledDigitalPulses) {
      if (cycle >= pulse.startCycle && cycle < pulse.endCycle) {
        this.writeExternalDigitalInput(
          pulse.pin,
          1,
        );
        active.push(pulse);
      }
    }

    this.scheduledDigitalPulses =
      this.scheduledDigitalPulses.filter(
        (pulse) => pulse.endCycle > cycle,
      );

    // If multiple pulses overlap, any active pulse keeps the input HIGH.
    // Baseline LOW is restored automatically on the next instruction.
    void active;
  }

  private composeInputRegister(
    ddrAddress: number,
    portAddress: number,
    levels: Record<string, 0 | 1>,
    port: "B" | "C" | "D",
  ): number {
    if (!this.cpu) {
      return 0;
    }

    const ddr = this.cpu.data[ddrAddress] ?? 0;
    const portValue = this.cpu.data[portAddress] ?? 0;

    let value = 0;

    for (let bit = 0; bit < 8; bit += 1) {
      const pin = this.portBitToArduinoPin(
        port,
        bit,
      );

      const isOutput =
        (ddr & (1 << bit)) !== 0;

      let level = 0;

      if (isOutput) {
        level =
          (portValue & (1 << bit)) !== 0
            ? 1
            : 0;
      } else if (pin !== null) {
        // External circuit state wins. When no external source exists,
        // PORT=1 behaves like the AVR's internal pull-up.
        if (levels[pin] !== undefined) {
          level = levels[pin];
        } else {
          level =
            (portValue & (1 << bit)) !== 0
              ? 1
              : 0;
        }
      }

      if (level === 1) {
        value |= 1 << bit;
      }
    }

    return value;
  }

  private portBitToArduinoPin(
    port: "B" | "C" | "D",
    bit: number,
  ): string | null {
    if (port === "D" && bit >= 0 && bit <= 7) {
      return "D" + bit;
    }

    if (port === "B" && bit >= 0 && bit <= 5) {
      return "D" + (8 + bit);
    }

    if (port === "C" && bit >= 0 && bit <= 5) {
      return "A" + bit;
    }

    return null;
  }

  getCycles(): number {
    return this.cpu?.cycles ?? 0;
  }

  private syncGpioToRuntime(): void {
    if (!this.cpu || !this.arduino) return;

    const data = this.cpu.data;

    this.arduino.applyPortRegister(
      "B",
      data[DDRB],
      data[PORTB],
    );

    this.arduino.applyPortRegister(
      "C",
      data[DDRC],
      data[PORTC],
    );

    this.arduino.applyPortRegister(
      "D",
      data[DDRD],
      data[PORTD],
    );

    this.syncPwmToRuntime();
  }

  private syncPwmToRuntime(): void {
    if (!this.cpu || !this.arduino) {
      return;
    }

    const data = this.cpu.data;

    const pwmChannels: Array<{
      pin: number;
      tccrAddress: number;
      comShift: number;
      ocr: number;
    }> = [
      {
        pin: 6,
        tccrAddress: TCCR0A,
        comShift: 6,
        ocr: data[OCR0A],
      },
      {
        pin: 5,
        tccrAddress: TCCR0A,
        comShift: 4,
        ocr: data[OCR0B],
      },
      {
        pin: 9,
        tccrAddress: TCCR1A,
        comShift: 6,
        ocr:
          data[OCR1AL] |
          (data[OCR1AH] << 8),
      },
      {
        pin: 10,
        tccrAddress: TCCR1A,
        comShift: 4,
        ocr:
          data[OCR1BL] |
          (data[OCR1BH] << 8),
      },
      {
        pin: 11,
        tccrAddress: TCCR2A,
        comShift: 6,
        ocr: data[OCR2A],
      },
      {
        pin: 3,
        tccrAddress: TCCR2A,
        comShift: 4,
        ocr: data[OCR2B],
      },
    ];

    for (const channel of pwmChannels) {
      const control =
        data[channel.tccrAddress] ?? 0;

      const com =
        (control >> channel.comShift) & 0b11;

      const ddrAddress =
        channel.pin <= 7
          ? DDRD
          : DDRB;

      const bit =
        channel.pin <= 7
          ? channel.pin
          : channel.pin - 8;

      const isOutput =
        (data[ddrAddress] &
          (1 << bit)) !== 0;

      if (!isOutput || com === 0) {
        this.arduino.getState().digitalPins[
          channel.pin
        ].pwmDuty = undefined;
        continue;
      }

      const duty =
        Math.max(
          0,
          Math.min(
            1,
            channel.ocr / 255,
          ),
        );

      this.arduino.setPwmDuty(
        channel.pin,
        duty,
      );
    }
  }

  reset(): void {
    this.analogInputs = {};
    this.externalDigitalInputs = {};
    this.scheduledDigitalPulses = [];
    this.toggleCounts = {};
    this.cpu = null;
    this.program = null;
    this.arduino = null;
    this.timer0 = null;
    this.timer1 = null;
    this.timer2 = null;
    this.twi = null;
  }
}
