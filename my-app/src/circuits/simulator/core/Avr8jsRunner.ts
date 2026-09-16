import {
  CPU,
} from "avr8js";

// =====================================================
// AVR8JS RUNNER
// =====================================================

export class Avr8jsRunner {

  private cpu:
    CPU | null = null;

  private program:
    Uint16Array | null = null;

  // ===================================================
  // LOAD PROGRAM
  // ===================================================

  loadProgram(
    program: Uint16Array
  ): void {

    this.program =
      program;

    this.cpu =
      new CPU(program);
  }

  // ===================================================
  // GET CPU
  // ===================================================

  getCPU(): CPU | null {
    return this.cpu;
  }

  // ===================================================
  // RUN CYCLES
  // ===================================================

  runCycles(
    cycles: number
  ): void {

    if (!this.cpu) {
      throw new Error(
        "AVR program has not been loaded."
      );
    }

    for (
      let i = 0;
      i < cycles;
      i++
    ) {
      this.cpu.tick();
    }
  }

  // ===================================================
  // RESET
  // ===================================================

  reset(): void {
    this.cpu = null;

    this.program = null;
  }
}