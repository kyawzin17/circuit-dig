import type { TWIEventHandler } from "avr8js";

export interface Lcd1602RuntimeState {
  id: string;
  lines: [string, string];
  characters: number[];
  cursorX: number;
  cursorY: number;
  backlight: boolean;
  displayOn: boolean;
  cursorOn: boolean;
  blink: boolean;
  i2cAddress: number;
}

/**
 * Functional HD44780/PCF8574 model for the visual wokwi-lcd1602 element.
 *
 * The Arduino firmware still runs through AVR8JS. This class only models
 * the external LCD hardware that AVR8JS intentionally does not implement.
 */
export class Lcd1602Runtime {
  private readonly ddram = new Uint8Array(80);
  private address = 0;
  private cgramMode = false;
  private increment = true;

  private lastE: 0 | 1 = 0;
  private pendingNibble: number | null = null;
  private initNibbleCount = 0;
  private initialized = false;

  private backlight = true;
  private displayOn = true;
  private cursorOn = false;
  private blink = false;

  private readonly state: Lcd1602RuntimeState;

  constructor(
    public readonly id: string,
    public readonly i2cAddress = 0x27,
  ) {
    this.ddram.fill(0x20);
    this.state = {
      id,
      lines: ["                ", "                "],
      characters: Array(32).fill(0x20),
      cursorX: 0,
      cursorY: 0,
      backlight: true,
      displayOn: true,
      cursorOn: false,
      blink: false,
      i2cAddress,
    };

    this.syncState();
  }

  reset(): void {
    this.ddram.fill(0x20);
    this.cgram.fill(0);
    this.address = 0;
    this.cgramMode = false;
    this.increment = true;
    this.lastE = 0;
    this.pendingNibble = null;
    this.initNibbleCount = 0;
    this.initialized = false;
    this.backlight = true;
    this.displayOn = true;
    this.cursorOn = false;
    this.blink = false;
    this.syncState();
  }

  getState(): Lcd1602RuntimeState {
    return {
      ...this.state,
      lines: [...this.state.lines] as [string, string],
      characters: [...this.state.characters],
    };
  }

  /**
   * Feed the real GPIO levels of a parallel LCD bus.
   *
   * LiquidCrystal normally uses 4-bit mode (RS/E/D4..D7). If D0..D3
   * are physically wired, the model also accepts 8-bit transfers.
   */
  processParallelBus(bus: {
    rs: 0 | 1;
    rw: 0 | 1;
    e: 0 | 1;
    d0: 0 | 1;
    d1: 0 | 1;
    d2: 0 | 1;
    d3: 0 | 1;
    d4: 0 | 1;
    d5: 0 | 1;
    d6: 0 | 1;
    d7: 0 | 1;
    lowNibbleWired: boolean;
  }): void {
    if (bus.rw === 1) {
      this.lastE = bus.e;
      return;
    }

    if (this.lastE === 1 && bus.e === 0) {
      if (bus.lowNibbleWired) {
        this.writeByte(
          bus.rs,
          bus.d0 |
            (bus.d1 << 1) |
            (bus.d2 << 2) |
            (bus.d3 << 3) |
            (bus.d4 << 4) |
            (bus.d5 << 5) |
            (bus.d6 << 6) |
            (bus.d7 << 7),
        );
      } else {
        const nibble =
          bus.d4 |
          (bus.d5 << 1) |
          (bus.d6 << 2) |
          (bus.d7 << 3);

        /*
         * HD44780 4-bit initialization starts while the controller
         * is still in 8-bit mode: 0x3, 0x3, 0x3, then 0x2 are sent
         * as standalone nibbles. Do not pair those four pulses.
         */
        if (
          !this.initialized &&
          bus.rs === 0 &&
          (nibble === 0x03 || nibble === 0x02)
        ) {
          if (nibble === 0x03) {
            this.initNibbleCount += 1;
          } else if (this.initNibbleCount > 0) {
            this.initialized = true;
            this.fourBitMode = true;
          }

          this.pendingNibble = null;
        } else if (this.pendingNibble === null) {
          this.pendingNibble = nibble << 4;
        } else {
          const value =
            this.pendingNibble | nibble;
          this.pendingNibble = null;
          this.writeByte(bus.rs, value);
        }
      }
    }

    this.lastE = bus.e;
  }

  /**
   * Accept one PCF8574 output byte from an I2C LCD backpack.
   *
   * PCF8574 mapping used by Wokwi:
   * P0=RS, P1=RW, P2=E, P3=backlight, P4..P7=D4..D7.
   */
  processPcf8574(value: number): void {
    const next = value & 0xff;
    const e = ((next >> 2) & 1) as 0 | 1;

    this.backlight = (next & 0x08) !== 0;

    if (this.lastE === 1 && e === 0) {
      const rs = (next & 0x01) ? 1 : 0;
      const rw = (next & 0x02) ? 1 : 0;
      const nibble = (next >> 4) & 0x0f;

      if (rw === 0) {
        /*
         * PCF8574 LCD libraries use the same standalone 0x3,0x3,0x3,0x2
         * initialization sequence before normal 4-bit transfers.
         */
        if (
          !this.initialized &&
          rs === 0 &&
          (nibble === 0x03 || nibble === 0x02)
        ) {
          if (nibble === 0x03) {
            this.initNibbleCount += 1;
          } else if (this.initNibbleCount > 0) {
            this.initialized = true;
            this.fourBitMode = true;
          }

          this.pendingNibble = null;
        } else if (this.pendingNibble === null) {
          this.pendingNibble = nibble << 4;
        } else {
          const value8 =
            this.pendingNibble | nibble;
          this.pendingNibble = null;
          this.writeByte(rs, value8);
        }
      }
    }

    this.lastE = e;
    this.syncState();
  }

  private writeByte(
    rs: 0 | 1,
    value: number,
  ): void {
    if (rs === 1) {
      this.writeData(value & 0xff);
    } else {
      this.writeCommand(value & 0xff);
    }

    this.syncState();
  }

  private writeCommand(command: number): void {
    if (command === 0x01) {
      this.ddram.fill(0x20);
      this.address = 0;
      this.cgramMode = false;
      return;
    }

    if (command === 0x02) {
      this.address = 0;
      this.cgramMode = false;
      return;
    }

    if ((command & 0xfc) === 0x04) {
      this.increment = (command & 0x02) !== 0;
      return;
    }

    if ((command & 0xf8) === 0x08) {
      this.displayOn = (command & 0x04) !== 0;
      this.cursorOn = (command & 0x02) !== 0;
      this.blink = (command & 0x01) !== 0;
      return;
    }

    if ((command & 0xf0) === 0x10) {
      const displayMove = (command & 0x08) !== 0;
      const right = (command & 0x04) !== 0;

      if (displayMove) {
        // The visual model keeps DDRAM stable. The important observable
        // behavior for normal Arduino sketches is cursor positioning.
        return;
      }

      this.address = Math.max(
        0,
        Math.min(
          79,
          this.address + (right ? 1 : -1),
        ),
      );
      return;
    }

    if ((command & 0xe0) === 0x20) {
      this.fourBitMode = (command & 0x10) === 0;
      return;
    }

    if ((command & 0xc0) === 0x40) {
      this.address = command & 0x3f;
      this.cgramMode = true;
      return;
    }

    if ((command & 0x80) !== 0) {
      this.address = command & 0x7f;
      this.cgramMode = false;
    }
  }

  private writeData(value: number): void {
    if (!this.cgramMode) {
      this.ddram[this.address % this.ddram.length] =
        value & 0xff;
    }

    if (this.increment) {
      this.address = (this.address + 1) & 0x7f;
    } else {
      this.address = (this.address - 1) & 0x7f;
    }
  }

  private syncState(): void {
    const line0 = Array(16).fill(0x20);
    const line1 = Array(16).fill(0x20);

    for (let col = 0; col < 16; col += 1) {
      line0[col] = this.ddram[col] ?? 0x20;
      line1[col] = this.ddram[0x40 + col] ?? 0x20;
    }

    const toText = (values: number[]) =>
      values
        .map((value) =>
          value >= 32 && value <= 255
            ? String.fromCharCode(value)
            : " ",
        )
        .join("");

    this.state.lines = [
      toText(line0),
      toText(line1),
    ];

    this.state.characters = [
      ...line0,
      ...line1,
    ];

    this.state.cursorX =
      this.address >= 0x40
        ? this.address - 0x40
        : this.address;

    this.state.cursorY =
      this.address >= 0x40 ? 1 : 0;

    this.state.backlight = this.backlight;
    this.state.displayOn = this.displayOn;
    this.state.cursorOn = this.cursorOn;
    this.state.blink = this.blink;
  }
}

/**
 * Multiplexes one or more LCD1602 I2C backpacks onto AVR8JS's TWI
 * peripheral. This is a real TWI transaction path: Arduino Wire writes
 * TWCR/TWDR, AVR8JS raises TWI events, and this handler acknowledges
 * the addressed PCF8574 device.
 */
export class Lcd1602I2cBus implements TWIEventHandler {
  private readonly devices = new Map<
    number,
    Lcd1602Runtime
  >();

  private active:
    Lcd1602Runtime | null = null;

  reset(): void {
    this.active = null;
    for (const device of this.devices.values()) {
      device.reset();
    }
  }

  setDevices(
    devices: Lcd1602Runtime[],
  ): void {
    this.devices.clear();

    for (const device of devices) {
      this.devices.set(
        device.i2cAddress,
        device,
      );
    }

    this.active = null;
  }

  start(_repeated: boolean): void {
    this.active = null;
  }

  stop(): void {
    this.active = null;
  }

  connectToSlave(
    addr: number,
    write: boolean,
  ): void {
    const device =
      this.devices.get(addr);

    this.active = device ?? null;

    // AVR8JS expects the event handler to explicitly acknowledge
    // or reject the address phase.
    this.twiCompleteConnect(
      Boolean(device) && write,
    );
  }

  writeByte(value: number): void {
    if (!this.active) {
      this.twiCompleteWrite(false);
      return;
    }

    this.active.processPcf8574(value);
    this.twiCompleteWrite(true);
  }

  readByte(_ack: boolean): void {
    // PCF8574 reads are not required by the common LCD libraries.
    this.twiCompleteRead(0xff);
  }

  private twi:
    import("avr8js").AVRTWI | null = null;

  attachTwi(twi: import("avr8js").AVRTWI): void {
    this.twi = twi;
  }

  private twiCompleteConnect(ack: boolean): void {
    this.twi?.completeConnect(ack);
  }

  private twiCompleteWrite(ack: boolean): void {
    this.twi?.completeWrite(ack);
  }

  private twiCompleteRead(value: number): void {
    this.twi?.completeRead(value);
  }

  getStates(): Record<
    string,
    Lcd1602RuntimeState
  > {
    const result: Record<
      string,
      Lcd1602RuntimeState
    > = {};

    for (const device of this.devices.values()) {
      result[device.id] =
        device.getState();
    }

    return result;
  }
}
