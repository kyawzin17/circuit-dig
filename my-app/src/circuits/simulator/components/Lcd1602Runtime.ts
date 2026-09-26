import { AVRTWI, type TWIEventHandler } from "avr8js";

export interface Lcd1602RuntimeState {
  id: string;
  text: string;
  characters: number[];
  rows: 2;
  cols: 16;
  cursorX: number;
  cursorY: number;
  displayOn: boolean;
  cursorOn: boolean;
  blink: boolean;
  backlight: boolean;
  mode: "4bit" | "8bit" | "i2c";
  i2cAddress?: number;
}

/**
 * Small HD44780-compatible LCD runtime.
 *
 * This is intentionally a device model, not a visual shortcut:
 * Arduino firmware still drives the LCD pins (parallel mode) or
 * performs real AVR TWI transactions (I2C mode). This class only
 * models the LCD controller that sits behind those electrical pins.
 */
export class Lcd1602Runtime {
  private readonly memory = new Uint8Array(32);
  private readonly cgram = new Uint8Array(64);

  private addressCounter = 0;
  private entryIncrement = true;
  private displayShift = false;
  private cgramMode = false;
  private pendingHighNibble: number | null = null;
  private init03Count = 0;
  private fourBitMode = false;

  private rs = 0;
  private rw = 0;
  private enable = 0;
  private backlight = true;

  private state: Lcd1602RuntimeState;

  constructor(
    public readonly id: string,
    mode: "4bit" | "8bit" | "i2c",
    i2cAddress?: number,
  ) {
    this.state = {
      id,
      text: " ".repeat(32),
      characters: Array.from(this.memory),
      rows: 2,
      cols: 16,
      cursorX: 0,
      cursorY: 0,
      displayOn: true,
      cursorOn: false,
      blink: false,
      backlight: true,
      mode,
      i2cAddress,
    };

    this.reset(mode, i2cAddress);
  }

  reset(
    mode: "4bit" | "8bit" | "i2c" = this.state.mode,
    i2cAddress = this.state.i2cAddress,
  ): void {
    this.memory.fill(0x20);
    this.cgram.fill(0);
    this.addressCounter = 0;
    this.entryIncrement = true;
    this.displayShift = false;
    this.cgramMode = false;
    this.pendingHighNibble = null;
    this.init03Count = 0;
    this.fourBitMode = mode !== "8bit";
    this.rs = 0;
    this.rw = 0;
    this.enable = 0;
    this.backlight = true;

    this.state = {
      id: this.id,
      text: " ".repeat(32),
      characters: Array.from(this.memory),
      rows: 2,
      cols: 16,
      cursorX: 0,
      cursorY: 0,
      displayOn: true,
      cursorOn: false,
      blink: false,
      backlight: true,
      mode,
      i2cAddress,
    };
  }

  getState(): Lcd1602RuntimeState {
    return {
      ...this.state,
      characters: [...this.state.characters],
    };
  }

  /**
   * Process one parallel LCD bus edge.
   *
   * The caller supplies the electrical logic levels currently present
   * on RS/RW/E and D0..D7 (or D4..D7 for 4-bit mode).
   */
  processParallelEdge(
    levels: {
      rs: 0 | 1;
      rw: 0 | 1;
      enable: 0 | 1;
      data: number;
    },
  ): void {
    const previousEnable = this.enable;

    this.rs = levels.rs;
    this.rw = levels.rw;
    this.enable = levels.enable;

    // HD44780 latches data on the falling edge of E.
    if (previousEnable === 1 && levels.enable === 0) {
      if (this.rw !== 0) {
        return;
      }

      if (this.fourBitMode || this.state.mode === "4bit") {
        this.writeNibble(levels.data & 0x0f, this.rs === 1);
      } else {
        this.writeByte(levels.data & 0xff, this.rs === 1);
      }
    }
  }

  /**
   * PCF8574 backpack output latch.
   *
   * Standard LiquidCrystal_I2C mapping:
   *   P0=RS, P1=RW, P2=E, P3=backlight,
   *   P4=D4, P5=D5, P6=D6, P7=D7.
   */
  processI2cExpanderByte(value: number): void {
    const next = value & 0xff;
    const nextEnable = ((next >> 2) & 1) as 0 | 1;
    const previousEnable = this.enable;

    this.rs = ((next >> 0) & 1) as 0 | 1;
    this.rw = ((next >> 1) & 1) as 0 | 1;
    this.enable = nextEnable;
    this.backlight = ((next >> 3) & 1) !== 0;

    this.state.backlight = this.backlight;

    if (previousEnable === 1 && nextEnable === 0 && this.rw === 0) {
      const nibble =
        ((next >> 4) & 0x0f) as number;
      this.writeNibble(nibble, this.rs === 1);
    }
  }

  private writeNibble(
    nibble: number,
    dataMode: boolean,
  ): void {
    const value = nibble & 0x0f;

    /*
     * HD44780 power-up starts in 8-bit mode even when the host intends
     * 4-bit mode. The LiquidCrystal libraries send 0x3,0x3,0x3,0x2
     * as single nibbles. Recognize that sequence explicitly.
     */
    if (!this.fourBitMode && !dataMode) {
      if (value === 0x03) {
        this.init03Count += 1;
        return;
      }

      if (value === 0x02 && this.init03Count >= 1) {
        this.fourBitMode = true;
        this.state.mode = "4bit";
        this.pendingHighNibble = null;
        return;
      }
    }

    if (this.pendingHighNibble === null) {
      this.pendingHighNibble = value;
      return;
    }

    const byte =
      (this.pendingHighNibble << 4) |
      value;

    this.pendingHighNibble = null;
    this.writeByte(byte, dataMode);
  }

  private writeByte(
    value: number,
    dataMode: boolean,
  ): void {
    if (dataMode) {
      this.writeData(value);
    } else {
      this.writeCommand(value);
    }
  }

  private writeData(value: number): void {
    if (this.cgramMode) {
      this.cgram[this.addressCounter & 0x3f] =
        value & 0x1f;
      this.addressCounter =
        (this.addressCounter + 1) & 0x3f;
      return;
    }

    const address =
      this.addressCounter & 0x7f;

    if (address < 0x10) {
      this.memory[address] = value & 0xff;
    } else if (address >= 0x40 && address < 0x50) {
      this.memory[16 + (address - 0x40)] =
        value & 0xff;
    }

    this.addressCounter =
      this.entryIncrement
        ? ((this.addressCounter + 1) & 0x7f)
        : ((this.addressCounter - 1) & 0x7f);

    this.publish();
  }

  private writeCommand(command: number): void {
    const value = command & 0xff;

    if (value === 0x01) {
      this.memory.fill(0x20);
      this.addressCounter = 0;
      this.cgramMode = false;
      this.publish();
      return;
    }

    if (value === 0x02) {
      this.addressCounter = 0;
      this.cgramMode = false;
      this.publish();
      return;
    }

    if ((value & 0x80) !== 0) {
      this.addressCounter = value & 0x7f;
      this.cgramMode = false;
      this.publish();
      return;
    }

    if ((value & 0xc0) === 0x40) {
      this.addressCounter = value & 0x3f;
      this.cgramMode = true;
      return;
    }

    if ((value & 0xfc) === 0x04) {
      this.entryIncrement =
        (value & 0x02) !== 0;
      this.displayShift =
        (value & 0x01) !== 0;
      return;
    }

    if ((value & 0xf8) === 0x08) {
      this.state.displayOn =
        (value & 0x04) !== 0;
      this.state.cursorOn =
        (value & 0x02) !== 0;
      this.state.blink =
        (value & 0x01) !== 0;
      return;
    }

    if ((value & 0xf0) === 0x10) {
      return;
    }

    if ((value & 0xe0) === 0x20) {
      if ((value & 0x10) === 0) {
        this.fourBitMode = true;
        this.state.mode = "4bit";
      } else {
        this.fourBitMode = false;
        this.state.mode = "8bit";
      }
      return;
    }
  }

  private publish(): void {
    const chars = Array.from(this.memory);

    this.state.characters = chars;
    this.state.text =
      String.fromCharCode(...chars);

    const address =
      this.addressCounter & 0x7f;

    if (address >= 0x40 && address < 0x50) {
      this.state.cursorY = 1;
      this.state.cursorX = address - 0x40;
    } else {
      this.state.cursorY =
        address >= 0x40 ? 1 : 0;
      this.state.cursorX =
        address >= 0x40
          ? address - 0x40
          : address;
    }
  }
}

export class Lcd1602I2cEventHandler
  implements TWIEventHandler {
  private selected: Lcd1602Runtime | null = null;

  constructor(
    private readonly displays: () => Lcd1602Runtime[],
    private readonly twi: AVRTWI,
    private readonly canConnect?: (
      display: Lcd1602Runtime,
    ) => boolean,
  ) {}

  start(): void {
    this.selected = null;
    this.twi.completeStart();
  }

  stop(): void {
    this.selected = null;
    this.twi.completeStop();
  }

  connectToSlave(
    addr: number,
    write: boolean,
  ): void {
    const display = this.displays().find(
      (item) =>
        item.getState().i2cAddress === addr &&
        (this.canConnect
          ? this.canConnect(item)
          : true),
    );

    this.selected =
      display ?? null;

    this.twi.completeConnect(
      Boolean(this.selected && write),
    );
  }

  writeByte(value: number): void {
    if (this.selected) {
      this.selected.processI2cExpanderByte(value);
    }

    this.twi.completeWrite(
      this.selected !== null,
    );
  }

  readByte(): void {
    this.twi.completeRead(0);
  }
}
