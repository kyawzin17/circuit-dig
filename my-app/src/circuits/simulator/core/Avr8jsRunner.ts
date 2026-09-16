import { CPU } from "avr8js";
import type { ArduinoUnoRuntime } from "../boards/ArduinoUnoRuntime";

const DDRB = 0x24;
const PORTB = 0x25;
const DDRC = 0x27;
const PORTC = 0x28;
const DDRD = 0x2a;
const PORTD = 0x2b;

export class Avr8jsRunner {
  private cpu: CPU | null = null;
  private program: Uint16Array | null = null;
  private arduino: ArduinoUnoRuntime | null = null;

  loadProgram(program: Uint16Array, arduino?: ArduinoUnoRuntime): void {
    this.program = program;
    this.cpu = new CPU(program);
    this.arduino = arduino ?? null;
    this.syncGpioToRuntime();
  }

  getCPU(): CPU | null { return this.cpu; }

  runCycles(cycles: number): void {
    if (!this.cpu) throw new Error("AVR program has not been loaded.");
    const count = Math.max(0, Math.floor(cycles));
    for (let i = 0; i < count; i += 1) this.cpu.tick();
    this.syncGpioToRuntime();
  }

  private syncGpioToRuntime(): void {
    if (!this.cpu || !this.arduino) return;
    const data = this.cpu.data;
    this.arduino.applyPortRegister("B", data[DDRB], data[PORTB]);
    this.arduino.applyPortRegister("C", data[DDRC], data[PORTC]);
    this.arduino.applyPortRegister("D", data[DDRD], data[PORTD]);
  }

  reset(): void {
    this.cpu = null;
    this.program = null;
    this.arduino = null;
  }
}
