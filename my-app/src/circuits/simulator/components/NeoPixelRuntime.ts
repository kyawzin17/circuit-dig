import type { NeoPixelRuntimeState } from "../types/simulator.types";

const RESET_MIN_US = 50;
const DEFAULT_FREQUENCY_HZ = 16_000_000;

/**
 * Functional WS2812B / NeoPixel pixel model.
 *
 * The real device uses a single-wire NRZ protocol:
 * - 800 kHz nominal bit rate
 * - short HIGH pulse = 0
 * - long HIGH pulse = 1
 * - 24 bits per pixel, GRB order, MSB first
 * - LOW >= 50 us latches the received frame
 *
 * This runtime intentionally decodes the actual AVR GPIO edge timing
 * instead of reading Arduino source code or Adafruit_NeoPixel state.
 */
export class NeoPixelRuntime {
  private readonly id: string;
  private readonly frequencyHz: number;

  private powered = false;
  private lastLevel: 0 | 1 = 0;
  private highStartCycle: number | null = null;
  private lastFallingCycle: number | null = null;

  private bits: number[] = [];
  private latchedBits: number[] = [];

  private red = 0;
  private green = 0;
  private blue = 0;
  private frame = 0;
  private latched = false;

  constructor(
    id: string,
    frequencyHz = DEFAULT_FREQUENCY_HZ,
  ) {
    this.id = id;
    this.frequencyHz = Math.max(1, frequencyHz);
  }

  reset(): void {
    this.powered = false;
    this.lastLevel = 0;
    this.highStartCycle = null;
    this.lastFallingCycle = null;
    this.bits = [];
    this.latchedBits = [];
    this.red = 0;
    this.green = 0;
    this.blue = 0;
    this.frame = 0;
    this.latched = false;
  }

  setPowered(powered: boolean): void {
    if (this.powered && !powered) {
      this.resetSignalDecoder();
    }

    this.powered = powered;

    if (!powered) {
      this.red = 0;
      this.green = 0;
      this.blue = 0;
      this.latched = false;
    }
  }

  /**
   * Feed one real DIN GPIO transition from the AVR runner.
   */
  handleGpioChange(
    level: 0 | 1,
    cycle: number,
  ): void {
    if (!this.powered) {
      return;
    }

    const currentCycle = Math.max(0, Math.floor(cycle));

    if (level === this.lastLevel) {
      return;
    }

    if (level === 1) {
      /*
       * A long LOW period is the WS2812B reset/latch condition.
       * We latch immediately before accepting the next frame.
       */
      if (
        this.lastFallingCycle !== null &&
        currentCycle - this.lastFallingCycle >=
          this.usToCycles(RESET_MIN_US)
      ) {
        this.latchReceivedFrame();
      }

      this.highStartCycle = currentCycle;
      this.lastLevel = 1;
      return;
    }

    /*
     * LOW transition closes one encoded bit. The bit value is determined
     * from HIGH pulse width, not from the low pulse width.
     */
    if (this.highStartCycle !== null) {
      const highCycles =
        currentCycle - this.highStartCycle;

      /*
       * The simulator's AVR-compatible NeoPixel driver emits the waveform
       * with direct PORT writes. The GPIO edge itself includes the AVR
       * instruction overhead around the delay_cycles() call, so the
       * observed pulse is longer than the raw delay value. Keep the
       * classification centered on the WS2812B T0H/T1H boundary while
       * allowing that deterministic AVR overhead.
       *
       * Nominal WS2812B values are roughly:
       *   T0H ~= 0.35 us
       *   T1H ~= 0.70 us
       *
       * A 0.60 us boundary cleanly separates the two in our AVR trace.
       */
      const zeroMaxCycles =
        this.usToCycles(0.55);

      const oneMinCycles =
        this.usToCycles(0.60);

      if (
        highCycles >= 1 &&
        highCycles <= this.usToCycles(1.8)
      ) {
        const bit =
          highCycles >= oneMinCycles
            ? 1
            : highCycles <= zeroMaxCycles
              ? 0
              : this.classifyBorderlinePulse(
                  highCycles,
                );

        /*
         * Keep a bounded shift buffer. A very long malformed stream must
         * never make the simulator allocate indefinitely.
         */
        if (this.bits.length < 24 * 1024) {
          this.bits.push(bit);
        }
      }
    }

    this.lastFallingCycle = currentCycle;
    this.highStartCycle = null;
    this.lastLevel = 0;
  }

  /**
   * Flush a WS2812B reset/latch interval even when the firmware does not
   * produce another rising edge. This is required for the final
   * pixels.show() in setup(), because the latch happens during the
   * following LOW interval.
   */
  flush(cycle: number): void {
    if (
      !this.powered ||
      this.lastLevel !== 0 ||
      this.lastFallingCycle === null
    ) {
      return;
    }

    if (
      Math.max(0, Math.floor(cycle)) -
        this.lastFallingCycle >=
      this.usToCycles(RESET_MIN_US)
    ) {
      this.latchReceivedFrame();
    }
  }

  /**
   * Return and clear the most recently latched raw frame.
   * Used by the simulation engine to distribute data through a DOUT->DIN
   * NeoPixel chain.
   */
  consumeLatchedBits(): number[] | null {
    if (this.latchedBits.length === 0) {
      return null;
    }

    const frame = this.latchedBits.slice();
    this.latchedBits = [];
    return frame;
  }

  /**
   * Apply exactly one 24-bit WS2812B pixel payload.
   * Data order is GRB, MSB first.
   */
  applyFrameBits(frameBits: number[]): void {
    if (!this.powered || frameBits.length < 24) {
      return;
    }

    const readByte = (offset: number): number => {
      let value = 0;

      for (let bit = 0; bit < 8; bit += 1) {
        value =
          (value << 1) |
          (frameBits[offset + bit] ? 1 : 0);
      }

      return value;
    };

    this.green = readByte(0);
    this.red = readByte(8);
    this.blue = readByte(16);

    this.latched = true;
    this.frame += 1;
  }

  getState(): NeoPixelRuntimeState {
    return {
      id: this.id,
      red: this.red,
      green: this.green,
      blue: this.blue,
      color: NeoPixelRuntime.toCssColor(
        this.red,
        this.green,
        this.blue,
      ),
      brightness:
        Math.max(
          this.red,
          this.green,
          this.blue,
        ) / 255,
      powered: this.powered,
      latched: this.latched,
      frame: this.frame,
      dataBits: this.bits.length,
      interfaceType: "ws2812b",
    };
  }

  private latchReceivedFrame(): void {
    if (this.bits.length >= 24) {
      this.latchedBits = this.bits.slice();
      this.applyFrameBits(this.bits);
    }

    this.bits = [];
    this.highStartCycle = null;
    this.lastFallingCycle = null;
  }

  private resetSignalDecoder(): void {
    this.lastLevel = 0;
    this.highStartCycle = null;
    this.lastFallingCycle = null;
    this.bits = [];
    this.latchedBits = [];
  }

  private classifyBorderlinePulse(
    highCycles: number,
  ): 0 | 1 {
    const midpoint =
      this.usToCycles(0.60);

    return highCycles >= midpoint ? 1 : 0;
  }

  private usToCycles(
    microseconds: number,
  ): number {
    return Math.max(
      1,
      Math.round(
        (microseconds / 1_000_000) *
          this.frequencyHz,
      ),
    );
  }

  private static toCssColor(
    red: number,
    green: number,
    blue: number,
  ): string {
    return (
      "#" +
      [red, green, blue]
        .map((value) =>
          value
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
}
