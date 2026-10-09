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
  AVRSPI,
  spiConfig,
  AVRUSART,
  usart0Config,
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

const TCNT0 = 0x46;
const TCNT1L = 0x84;
const TCNT1H = 0x85;
const TCNT2 = 0xb2;

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

  /*
   * GPIO output tracking is write-driven rather than instruction-driven.
   * The previous implementation compared PORT/DDR registers after every
   * AVR instruction, which added a large amount of JavaScript work to the
   * 16 MHz emulation loop.
   */
  private gpioDirty = {
    B: false,
    C: false,
    D: false,
  };

  private lastOutput = {
    B: 0,
    C: 0,
    D: 0,
  };

  private timer0: AVRTimer | null = null;
  private timer1: AVRTimer | null = null;
  private timer2: AVRTimer | null = null;
  private twi: AVRTWI | null = null;
  private spi: AVRSPI | null = null;
  private usart: AVRUSART | null = null;
  private serialByteHandler?: (value: number, cycle: number) => void;
  private serialReceiveHandler?: (cycle: number) => void;

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
    this.gpioDirty = {
      B: false,
      C: false,
      D: false,
    };
    this.lastOutput = {
      B: 0,
      C: 0,
      D: 0,
    };

    this.installGpioWriteHooks();

    // Arduino UNO's Timer0 drives millis()/micros()/delay().
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.twi = new AVRTWI(
      this.cpu,
      twiConfig,
      16_000_000,
    );

    this.spi = new AVRSPI(
      this.cpu,
      spiConfig,
      16_000_000,
    );

    // Use avr8js' real USART0 peripheral so HardwareSerial gets the
    // correct UDRE/TXC flags and baud-rate transmission timing.
    this.usart = new AVRUSART(
      this.cpu,
      usart0Config,
      16_000_000,
    );
    this.installSerialWriteHook();

    this.syncGpioToRuntime();
  }

  getCPU(): CPU | null {
    return this.cpu;
  }

  setSerialByteHandler(
    handler: ((value: number, cycle: number) => void) | null,
  ): void {
    this.serialByteHandler = handler ?? undefined;
    if (this.usart) {
      this.installSerialWriteHook();
    }
  }

  setSerialReceiveHandler(
    handler: ((cycle: number) => void) | null,
  ): void {
    this.serialReceiveHandler = handler ?? undefined;
    if (this.usart) {
      this.installSerialWriteHook();
    }
  }

  receiveSerialByte(value: number, immediate = false): boolean {
    return this.usart?.writeByte(value & 0xff, immediate) ?? false;
  }

  restartProgram(): void {
    if (!this.program || !this.arduino) {
      return;
    }
    const program = this.program;
    const arduino = this.arduino;
    this.loadProgram(program, arduino);
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

  getSpi(): AVRSPI | null {
    return this.spi;
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

    const match = pin.match(/^(D|A)(\d+)$/i);
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

      /*
       * Only inspect GPIO ports when the AVR actually wrote to PORTx
       * or DDRx. This preserves cycle-accurate GPIO transitions while
       * removing six register reads/comparisons from every instruction.
       */
      if (this.gpioDirty.B) {
        const output =
          (this.cpu.data[PORTB] ?? 0) &
          (this.cpu.data[DDRB] ?? 0);

        this.recordPortChanges(
          "B",
          this.lastOutput.B ^ output,
          output,
          onGpioChange,
        );

        this.lastOutput.B = output;
        this.gpioDirty.B = false;
      }

      if (this.gpioDirty.C) {
        const output =
          (this.cpu.data[PORTC] ?? 0) &
          (this.cpu.data[DDRC] ?? 0);

        this.recordPortChanges(
          "C",
          this.lastOutput.C ^ output,
          output,
          onGpioChange,
        );

        this.lastOutput.C = output;
        this.gpioDirty.C = false;
      }

      if (this.gpioDirty.D) {
        const output =
          (this.cpu.data[PORTD] ?? 0) &
          (this.cpu.data[DDRD] ?? 0);

        this.recordPortChanges(
          "D",
          this.lastOutput.D ^ output,
          output,
          onGpioChange,
        );

        this.lastOutput.D = output;
        this.gpioDirty.D = false;
      }

      if (this.scheduledDigitalPulses.length > 0) {
        this.applyScheduledDigitalPulses();
      }

      /*
       * Timer compare outputs are generated inside the AVR timer
       * peripheral; they do not write PORTx. Sample those OC pins at a
       * small deterministic interval so the electrical layer sees the
       * actual HIGH/LOW PWM waveform instead of 5V * duty as a fake DC
       * voltage. 32 CPU cycles is far below one PWM period on an UNO.
       */
      if ((this.cpu.cycles & 31) === 0) {
        this.syncHardwarePwmOutputs();
      }
    }

    this.syncHardwarePwmOutputs();
    this.syncGpioToRuntime();
  }

  /**
   * Read the ATmega328P timer compare output state for Arduino UNO PWM
   * pins. This follows the AVR's non-inverting/inverting OC behavior for
   * the 8-bit Fast/Phase-Correct modes used by analogWrite().
   */
  private syncHardwarePwmOutputs(): void {
    if (!this.cpu || !this.arduino) return;

    const read16 = (low: number, high: number) =>
      (this.cpu!.data[low] ?? 0) |
      ((this.cpu!.data[high] ?? 0) << 8);

    // Timer0: D6=OC0A, D5=OC0B, Fast PWM in Arduino analogWrite().
    const t0 = this.cpu.data[TCNT0] ?? 0;
    const t0a = this.cpu.data[OCR0A] ?? 0;
    const t0b = this.cpu.data[OCR0B] ?? 0;
    const t0Control = this.cpu.data[TCCR0A] ?? 0;
    const t0ComA = (t0Control >> 6) & 0x3;
    const t0ComB = (t0Control >> 4) & 0x3;
    if (t0ComA) {
      // Re-assert PWM mode after Arduino core writes DDR/PORT. Those GPIO
      // writes intentionally clear pwmDuty, but the timer COM bits are the
      // real source of truth once hardware PWM is enabled.
      this.arduino.setPwmDuty(6, t0a / 255);
      this.arduino.setPwmOutputLevel(
        6,
        t0ComA === 2
          ? (t0 < t0a ? 1 : 0)
          : (t0 >= t0a ? 1 : 0),
      );
    }
    if (t0ComB) {
      this.arduino.setPwmDuty(5, t0b / 255);
      this.arduino.setPwmOutputLevel(
        5,
        t0ComB === 2
          ? (t0 < t0b ? 1 : 0)
          : (t0 >= t0b ? 1 : 0),
      );
    }

    // Timer1: D9=OC1A, D10=OC1B. UNO analogWrite uses 8-bit phase-correct.
    const t1 = read16(TCNT1L, TCNT1H);
    const t1a = read16(OCR1AL, OCR1AH) & 0xff;
    const t1b = read16(OCR1BL, OCR1BH) & 0xff;
    const t1Control = this.cpu.data[TCCR1A] ?? 0;
    const t1ComA = (t1Control >> 6) & 0x3;
    const t1ComB = (t1Control >> 4) & 0x3;
    if (t1ComA) {
      this.arduino.setPwmDuty(9, t1a / 255);
      this.arduino.setPwmOutputLevel(
        9,
        t1ComA === 2
          ? (t1 < t1a ? 1 : 0)
          : (t1 >= t1a ? 1 : 0),
      );
    }
    if (t1ComB) {
      this.arduino.setPwmDuty(10, t1b / 255);
      this.arduino.setPwmOutputLevel(
        10,
        t1ComB === 2
          ? (t1 < t1b ? 1 : 0)
          : (t1 >= t1b ? 1 : 0),
      );
    }

    // Timer2: D3=OC2B, D11=OC2A. UNO analogWrite uses phase-correct.
    const t2 = this.cpu.data[TCNT2] ?? 0;
    const t2a = this.cpu.data[OCR2A] ?? 0;
    const t2b = this.cpu.data[OCR2B] ?? 0;
    const t2Control = this.cpu.data[TCCR2A] ?? 0;
    const t2ComA = (t2Control >> 6) & 0x3;
    const t2ComB = (t2Control >> 4) & 0x3;
    if (t2ComA) {
      this.arduino.setPwmDuty(11, t2a / 255);
      this.arduino.setPwmOutputLevel(
        11,
        t2ComA === 2
          ? (t2 < t2a ? 1 : 0)
          : (t2 >= t2a ? 1 : 0),
      );
    }
    if (t2ComB) {
      this.arduino.setPwmDuty(3, t2b / 255);
      this.arduino.setPwmOutputLevel(
        3,
        t2ComB === 2
          ? (t2 < t2b ? 1 : 0)
          : (t2 >= t2b ? 1 : 0),
      );
    }
  }

  private installGpioWriteHooks(): void {
    if (!this.cpu) {
      return;
    }

    this.cpu.writeHooks[PORTB] = () => {
      this.gpioDirty.B = true;
      return false;
    };

    this.cpu.writeHooks[DDRB] = () => {
      this.gpioDirty.B = true;
      return false;
    };

    this.cpu.writeHooks[PORTC] = () => {
      this.gpioDirty.C = true;
      return false;
    };

    this.cpu.writeHooks[DDRC] = () => {
      this.gpioDirty.C = true;
      return false;
    };

    this.cpu.writeHooks[PORTD] = () => {
      this.gpioDirty.D = true;
      return false;
    };

    this.cpu.writeHooks[DDRD] = () => {
      this.gpioDirty.D = true;
      return false;
    };
  }

  /**
   * Connect the simulator Serial Monitor to avr8js' real USART0 TX path.
   * AVRUSART handles UDRE/TXC flags, baud timing, and UDR0 writes.
   */
  private installSerialWriteHook(): void {
    if (!this.usart) {
      return;
    }

    this.usart.onByteTransmit = (value) => {
      this.serialByteHandler?.(
        value,
        this.cpu?.cycles ?? 0,
      );
    };

    this.usart.onRxComplete = () => {
      this.serialReceiveHandler?.(
        this.cpu?.cycles ?? 0,
      );
    };
  }

  // private serviceAdc(): void {
  //   if (!this.cpu) {
  //     return;
  //   }

  //   const data = this.cpu.data;
  //   const adcsra = data[ADCSRA] ?? 0;

  //   const adcEnabled =
  //     (adcsra & (1 << 7)) !== 0;
  //   const conversionStarted =
  //     (adcsra & (1 << 6)) !== 0;

  //   if (!adcEnabled || !conversionStarted) {
  //     return;
  //   }

  //   const admux = data[ADMUX] ?? 0;
  //   const channel = admux & 0x0f;

  //   const pinName =
  //     channel >= 0 && channel <= 5
  //       ? "A" + channel
  //       : null;

  //   const inputVoltage =
  //     pinName !== null
  //       ? this.analogInputs[pinName] ?? 0
  //       : 0;

  //   const referenceSelect =
  //     (admux >> 6) & 0b11;

  //   /*
  //    * ATmega328P ADMUX reference selection:
  //    *   00 = AVcc
  //    *   01 = AREF (external)
  //    *   11 = internal 1.1V
  //    *
  //    * AREF must not be treated as a generic 5V rail. For EXTERNAL
  //    * reference mode, use the actual voltage present on the AREF pin.
  //    * An un-driven AREF pin therefore produces an invalid/zero
  //    * reference instead of silently behaving like AVcc.
  //    */
  //   const referenceVoltage =
  //     referenceSelect === 0b01
  //       ? this.analogInputs.AREF ?? 0
  //       : referenceSelect === 0b11
  //         ? 1.1
  //         : 5.0;

  //   const normalized =
  //     Math.max(
  //       0,
  //       Math.min(
  //         1,
  //         inputVoltage / referenceVoltage,
  //       ),
  //     );

  //   const adcValue =
  //     Math.round(normalized * 1023);
    
  //   const leftAdjust =
  //     (admux & (1 << 5)) !== 0;

  //   if (leftAdjust) {
  //     data[ADCL] =
  //       (adcValue & 0x03) << 6;
  //     data[ADCH] =
  //       (adcValue >> 2) & 0xff;
  //   } else {
  //     data[ADCL] =
  //       adcValue & 0xff;
  //     data[ADCH] =
  //       (adcValue >> 8) & 0x03;
  //   }

  //   /*
  //    * ADC conversion complete:
  //    * - clear ADSC
  //    * - set ADIF
  //    */
  //   data[ADCSRA] =
  //     (adcsra & ~(1 << 6)) |
  //     (1 << 4);
  // }
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
    if (!this.cpu || this.scheduledDigitalPulses.length === 0) {
      return;
    }

    const cycle = this.cpu.cycles;

    /*
     * External digital inputs are already written to PINx when
     * setExternalDigitalInputs() is called. Do NOT rebuild all input
     * registers on every AVR instruction; that turns a 16 MHz simulation
     * into a large JavaScript allocation/iteration loop.
     *
     * Only scheduled time-based peripherals need to be checked while
     * the pulse queue is non-empty.
     */
    const remaining: ScheduledDigitalPulse[] = [];
    const activePins = new Set<string>();

    for (const pulse of this.scheduledDigitalPulses) {
      if (cycle >= pulse.startCycle && cycle < pulse.endCycle) {
        activePins.add(pulse.pin);
        this.writeExternalDigitalInput(pulse.pin, 1);
        remaining.push(pulse);
      } else if (cycle < pulse.startCycle) {
        remaining.push(pulse);
      } else {
        /*
         * Pulse expired. Restore the normal external input level for
         * this pin instead of leaving it HIGH.
         */
        this.writeExternalDigitalInput(
          pulse.pin,
          this.externalDigitalInputs[pulse.pin] ?? 0,
        );
      }
    }

    this.scheduledDigitalPulses = remaining;

    /*
     * If overlapping pulses exist, keep the pin HIGH. If a pin has no
     * active pulse, its baseline external level has already been restored.
     */
    for (const pin of activePins) {
      this.writeExternalDigitalInput(pin, 1);
    }
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

  /**
   * Synchronize the emulated AVR GPIO registers into the circuit runtime.
   *
   * This is intentionally public for cycle-sensitive peripherals such as
   * matrix keypads: a firmware scan changes a column output and the input
   * side of the same electrical circuit must be recomputed immediately,
   * before the next AVR instruction executes.
   */
  syncGpioToRuntime(): void {
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

    /*
     * Timer1 is owned by Servo.h while one or more servos are attached.
     * Servo.h uses CTC mode (WGM12) and drives the signal pins with direct
     * GPIO writes from TIMER1_COMPA_vect. In that mode D9/D10 are NOT
     * hardware-PWM outputs, so never expose their OCR values as generic
     * pwmDuty state. Doing so can make the electrical solver interpret the
     * servo control line as analogWrite-style PWM.
     */
    const timer1ControlB = data[0x81] ?? 0; // TCCR1B
    const timer1CtcMode =
      (timer1ControlB & (1 << 3)) !== 0;

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
      if (
        timer1CtcMode &&
        (channel.pin === 9 || channel.pin === 10)
      ) {
        this.arduino.getState().digitalPins[
          channel.pin
        ].pwmDuty = undefined;
        continue;
      }

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
    this.gpioDirty = {
      B: false,
      C: false,
      D: false,
    };
    this.lastOutput = {
      B: 0,
      C: 0,
      D: 0,
    };
    this.timer0 = null;
    this.timer1 = null;
    this.timer2 = null;
    this.twi = null;
    this.spi = null;
    this.usart = null;
    this.serialByteHandler = undefined;
    this.serialReceiveHandler = undefined;
  }
}
