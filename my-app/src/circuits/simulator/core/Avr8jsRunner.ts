import {
  avrInstruction,
  AVRTimer,
  CPU,
  timer0Config,
  timer1Config,
  timer2Config,
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

  private timer0: AVRTimer | null = null;
  private timer1: AVRTimer | null = null;
  private timer2: AVRTimer | null = null;

  loadProgram(
    program: Uint16Array,
    arduino?: ArduinoUnoRuntime
  ): void {
    this.program = program;
    this.cpu = new CPU(program);
    this.arduino = arduino ?? null;

    // Arduino UNO's Timer0 drives millis()/micros()/delay().
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    this.syncGpioToRuntime();
  }

  getCPU(): CPU | null {
    return this.cpu;
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
  }

  runCycles(cycles: number): void {
    if (!this.cpu) {
      throw new Error("AVR program has not been loaded.");
    }

    const count = Math.max(0, Math.floor(cycles));
    const targetCycles = this.cpu.cycles + count;

    while (this.cpu.cycles < targetCycles) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }

    this.syncGpioToRuntime();
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
    this.cpu = null;
    this.program = null;
    this.arduino = null;
    this.timer0 = null;
    this.timer1 = null;
    this.timer2 = null;
  }
}
