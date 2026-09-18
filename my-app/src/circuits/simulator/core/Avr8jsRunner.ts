import {
  avrInstruction,
  AVRTimer,
  CPU,
  timer0Config,
  timer1Config,
  timer2Config,
} from "avr8js";

import type { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";

const DDRB = 0x24;
const PORTB = 0x25;
const DDRC = 0x27;
const PORTC = 0x28;
const DDRD = 0x2a;
const PORTD = 0x2b;

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

  getCycles(): number {
    return this.cpu?.cycles ?? 0;
  }

  private syncGpioToRuntime(): void {
    if (!this.cpu || !this.arduino) return;

    const data = this.cpu.data;

    this.arduino.applyPortRegister(
      "B",
      data[DDRB],
      data[PORTB]
    );

    this.arduino.applyPortRegister(
      "C",
      data[DDRC],
      data[PORTC]
    );

    this.arduino.applyPortRegister(
      "D",
      data[DDRD],
      data[PORTD]
    );
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
