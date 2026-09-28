import type { PinLevel } from "../types/simulator.types";

export type Ds1307SqwMode =
  | 0x00
  | 0x80
  | 0x10
  | 0x11
  | 0x12
  | 0x13;

/**
 * Functional DS1307 RTC model.
 *
 * The model exposes the real DS1307 register map over the AVR TWI
 * peripheral. Time is stored as epoch milliseconds and advances from
 * the simulator clock, so firmware still performs the real I2C
 * transactions (Wire/RTClib) instead of reading JavaScript state.
 *
 * Register map:
 *   0x00 seconds + CH
 *   0x01 minutes
 *   0x02 hours (24h)
 *   0x03 day of week
 *   0x04 date
 *   0x05 month
 *   0x06 year (00..99)
 *   0x07 control
 *   0x08..0x3F 56-byte NV SRAM
 */
export class Ds1307Runtime {
  static readonly I2C_ADDRESS = 0x68;

  private static readonly REGISTER_COUNT = 0x40;

  private readonly registers = new Uint8Array(
    Ds1307Runtime.REGISTER_COUNT,
  );

  private readonly nvram = new Uint8Array(56);

  private powered = false;
  private halted = false;
  private pointer = 0;

  private epochMs = Date.now();
  private baseCycle = 0;
  private lastCycle = 0;
  private sqwBaseCycle = 0;
  private frequencyHz = 16_000_000;

  constructor(
    public readonly id: string,
    initTime?: unknown,
    frequencyHz = 16_000_000,
  ) {
    this.frequencyHz = Math.max(1, frequencyHz);
    this.epochMs = this.parseInitTime(initTime);
    this.loadEpochIntoRegisters(this.epochMs);
  }

  reset(
    initTime?: unknown,
    frequencyHz = this.frequencyHz,
  ): void {
    this.frequencyHz = Math.max(1, frequencyHz);
    this.pointer = 0;
    this.powered = false;
    this.halted = false;
    this.epochMs = this.parseInitTime(initTime);
    this.baseCycle = 0;
    this.lastCycle = 0;
    this.sqwBaseCycle = 0;
    this.registers.fill(0);
    this.nvram.fill(0);
    this.loadEpochIntoRegisters(this.epochMs);
  }

  setPowered(powered: boolean): void {
    this.powered = powered;
  }

  isPowered(): boolean {
    return this.powered;
  }

  acceptsI2cAddress(address: number): boolean {
    return (address & 0x7f) === Ds1307Runtime.I2C_ADDRESS;
  }

  advanceToCycle(cycle: number): void {
    if (cycle < this.lastCycle) {
      this.baseCycle = cycle;
      this.lastCycle = cycle;
      return;
    }

    this.lastCycle = cycle;

    if (!this.halted && this.powered) {
      const elapsedMs =
        ((cycle - this.baseCycle) / this.frequencyHz) *
        1000;

      this.epochMs += elapsedMs;
      this.baseCycle = cycle;
      this.loadEpochIntoRegisters(this.epochMs);
    } else {
      this.baseCycle = cycle;
    }
  }

  beginTransmission(): void {
    this.pointer = 0;
  }

  writeByte(value: number): void {
    if (!this.powered) {
      return;
    }

    const byte = value & 0xff;

    /*
     * The first byte after the slave address is the register pointer.
     * Subsequent bytes are written sequentially and wrap at 0x3F.
     */
    if (this.pointer === -1) {
      this.pointer = byte & 0x3f;
      return;
    }

    this.writeRegister(this.pointer, byte);
    this.pointer = (this.pointer + 1) & 0x3f;
  }

  /**
   * Called for the first byte after an I2C SLA+W transaction.
   * The DS1307 does not need a special command byte; it is simply
   * the register address.
   */
  setRegisterPointer(value: number): void {
    this.pointer = value & 0x3f;
  }

  readByte(): number {
    if (!this.powered) {
      return 0xff;
    }

    this.loadEpochIntoRegisters(this.epochMs);

    const value = this.readRegister(this.pointer);
    this.pointer = (this.pointer + 1) & 0x3f;
    return value;
  }

  writeRegister(register: number, value: number): void {
    const address = register & 0x3f;
    const byte = value & 0xff;

    if (address <= 0x06) {
      /*
       * RTClib writes the complete calendar as BCD. Keep the register
       * values canonical and rebuild epoch time when the seconds
       * register is updated. For normal RTClib.adjust(), the final
       * register values therefore become the source of truth.
       */
      this.registers[address] = this.normalizeTimeRegister(
        address,
        byte,
      );

      if (address === 0x00) {
        this.halted = (byte & 0x80) !== 0;
        this.rebuildEpochFromRegisters();
      } else if (address === 0x06) {
        this.rebuildEpochFromRegisters();
      }

      return;
    }

    if (address === 0x07) {
      this.registers[address] = byte & 0x93;
      return;
    }

    this.nvram[address - 0x08] = byte;
  }

  readRegister(register: number): number {
    const address = register & 0x3f;

    if (address <= 0x06) {
      this.loadEpochIntoRegisters(this.epochMs);
      return this.registers[address];
    }

    if (address === 0x07) {
      return this.registers[address];
    }

    return this.nvram[address - 0x08];
  }

  setSqwMode(mode: number): void {
    this.registers[0x07] =
      mode === 0x80 ||
      mode === 0x10 ||
      mode === 0x11 ||
      mode === 0x12 ||
      mode === 0x13
        ? mode
        : 0x00;
  }

  getSqwMode(): Ds1307SqwMode {
    const mode = this.registers[0x07] & 0x93;

    if (
      mode === 0x80 ||
      mode === 0x10 ||
      mode === 0x11 ||
      mode === 0x12 ||
      mode === 0x13
    ) {
      return mode;
    }

    return 0x00;
  }

  getSqwLevel(cycle: number): PinLevel {
    const mode = this.getSqwMode();

    if (!this.powered) {
      return 0;
    }

    if (mode === 0x00) {
      return 0;
    }

    if (mode === 0x80) {
      return 1;
    }

    const frequencies: Record<number, number> = {
      0x10: 1,
      0x11: 4096,
      0x12: 8192,
      0x13: 32768,
    };

    const frequency = frequencies[mode] ?? 0;

    if (frequency <= 0) {
      return 0;
    }

    const elapsedSeconds =
      Math.max(0, cycle - this.sqwBaseCycle) /
      this.frequencyHz;

    return Math.floor(elapsedSeconds * frequency) % 2 === 0
      ? 0
      : 1;
  }

  getEpochMs(cycle?: number): number {
    if (typeof cycle === "number") {
      this.advanceToCycle(cycle);
    }

    return this.epochMs;
  }

  getDateParts(cycle?: number): {
    year: number;
    month: number;
    day: number;
    date: number;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: number;
  } {
    this.getEpochMs(cycle);

    const date = new Date(this.epochMs);

    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      date: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      dayOfWeek: date.getUTCDay() + 1,
    };
  }

  getState(cycle?: number): {
    powered: boolean;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: number;
    sqwMode: Ds1307SqwMode;
    sqwLevel: PinLevel;
  } {
    const parts = this.getDateParts(cycle);

    return {
      powered: this.powered,
      ...parts,
      sqwMode: this.getSqwMode(),
      sqwLevel: this.getSqwLevel(
        cycle ?? this.lastCycle,
      ),
    };
  }

  private loadEpochIntoRegisters(epochMs: number): void {
    const date = new Date(epochMs);

    this.registers[0x00] =
      this.toBcd(date.getUTCSeconds()) |
      (this.halted ? 0x80 : 0);

    this.registers[0x01] =
      this.toBcd(date.getUTCMinutes());

    this.registers[0x02] =
      this.toBcd(date.getUTCHours());

    this.registers[0x03] =
      this.toBcd(date.getUTCDay() + 1);

    this.registers[0x04] =
      this.toBcd(date.getUTCDate());

    this.registers[0x05] =
      this.toBcd(date.getUTCMonth() + 1);

    this.registers[0x06] =
      this.toBcd(date.getUTCFullYear() % 100);
  }

  private rebuildEpochFromRegisters(): void {
    const second =
      this.fromBcd(this.registers[0x00] & 0x7f);

    const minute =
      this.fromBcd(this.registers[0x01] & 0x7f);

    const hour =
      this.fromBcd(this.registers[0x02] & 0x3f);

    const date =
      Math.max(1, Math.min(31, this.fromBcd(this.registers[0x04] & 0x3f)));

    const month =
      Math.max(1, Math.min(12, this.fromBcd(this.registers[0x05] & 0x1f)));

    const year =
      2000 + this.fromBcd(this.registers[0x06]);

    const next = new Date(
      Date.UTC(
        year,
        month - 1,
        date,
        hour,
        minute,
        second,
        0,
      ),
    );

    if (Number.isFinite(next.getTime())) {
      this.epochMs = next.getTime();
      this.baseCycle = this.lastCycle;
      this.sqwBaseCycle = this.lastCycle;
    }

    this.halted =
      (this.registers[0x00] & 0x80) !== 0;
  }

  private normalizeTimeRegister(
    address: number,
    value: number,
  ): number {
    switch (address) {
      case 0x00:
        return (
          (value & 0x80) |
          this.toBcd(
            Math.min(
              59,
              this.fromBcd(value & 0x7f),
            ),
          )
        );

      case 0x01:
        return this.toBcd(
          Math.min(59, this.fromBcd(value & 0x7f)),
        );

      case 0x02:
        return this.toBcd(
          Math.min(23, this.fromBcd(value & 0x3f)),
        );

      case 0x03:
        return this.toBcd(
          Math.max(
            1,
            Math.min(7, this.fromBcd(value & 0x07)),
          ),
        );

      case 0x04:
        return this.toBcd(
          Math.max(
            1,
            Math.min(31, this.fromBcd(value & 0x3f)),
          ),
        );

      case 0x05:
        return this.toBcd(
          Math.max(
            1,
            Math.min(12, this.fromBcd(value & 0x1f)),
          ),
        );

      case 0x06:
        return this.toBcd(
          this.fromBcd(value),
        );

      default:
        return value;
    }
  }

  private parseInitTime(value: unknown): number {
    if (typeof value !== "string" || value.length === 0 || value === "now") {
      return Date.now();
    }

    if (value === "0") {
      return Date.UTC(2000, 0, 1, 0, 0, 0, 0);
    }

    const parsed = Date.parse(value);

    return Number.isFinite(parsed)
      ? parsed
      : Date.now();
  }

  private toBcd(value: number): number {
    const normalized =
      Math.max(0, Math.floor(value));

    return (
      ((Math.floor(normalized / 10) & 0x0f) << 4) |
      (normalized % 10)
    );
  }

  private fromBcd(value: number): number {
    return (
      ((value >> 4) & 0x0f) * 10 +
      (value & 0x0f)
    );
  }
}

/**
 * Adapter for the avr8js TWI event protocol.
 *
 * DS1307 uses the standard register-pointer transaction:
 *   START + 0x68W + register
 *   REPEATED START + 0x68R + data...
 */
export class Ds1307I2cDevice {
  constructor(
    private readonly rtc: Ds1307Runtime,
  ) {}

  acceptsAddress(address: number): boolean {
    return this.rtc.acceptsI2cAddress(address);
  }

  connect(write: boolean): void {
    if (write) {
      this.rtc.beginTransmission();
    }
  }

  writeByte(value: number): void {
    /*
     * A fresh write transaction starts with a register pointer. The
     * runtime uses -1 as the "expecting pointer" sentinel.
     */
    if (this.firstByte) {
      this.rtc.setRegisterPointer(value);
      this.firstByte = false;
      return;
    }

    this.rtc.writeByte(value);
  }

  readByte(): number {
    return this.rtc.readByte();
  }

  resetTransaction(): void {
    this.firstByte = true;
  }

  private firstByte = true;
}
