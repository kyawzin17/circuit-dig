import { AVRTWI, type TWIEventHandler } from "avr8js";

export interface Ssd1306RuntimeState {
  id: string;
  width: 128;
  height: 64;
  pixels: number[];
  displayOn: boolean;
  invert: boolean;
  contrast: number;
  i2cAddress: number;
  powered: boolean;
  frame: number;
}

/**
 * Functional SSD1306 128x64 monochrome controller.
 *
 * The Wokwi element is presentation-only. This runtime models the
 * controller's I2C protocol and GDDRAM so real Arduino Wire/Adafruit
 * SSD1306 firmware drives the display.
 */
export class Ssd1306Runtime {
  private readonly framebuffer = new Uint8Array(128 * 8);

  private displayOn = false;
  private invert = false;
  private forceAllOn = false;
  private contrast = 0x7f;
  private powered = false;

  private memoryMode: 0 | 1 | 2 = 2; // horizontal / vertical / page
  private column = 0;
  private page = 0;
  private columnStart = 0;
  private columnEnd = 127;
  private pageStart = 0;
  private pageEnd = 7;
  private startLine = 0;
  private segmentRemap = false;
  private comScanReverse = false;

  private controlPending = true;
  private dataMode = false;

  private pendingCommand: number | null = null;
  private pendingArgs: number[] = [];

  private frame = 0;

  constructor(
    public readonly id: string,
    private readonly i2cAddress = 0x3c,
  ) {
    this.reset();
  }

  reset(): void {
    this.framebuffer.fill(0);

    this.displayOn = false;
    this.invert = false;
    this.forceAllOn = false;
    this.contrast = 0x7f;
    this.powered = false;

    this.memoryMode = 2;
    this.column = 0;
    this.page = 0;
    this.columnStart = 0;
    this.columnEnd = 127;
    this.pageStart = 0;
    this.pageEnd = 7;
    this.startLine = 0;
    this.segmentRemap = false;
    this.comScanReverse = false;

    this.controlPending = true;
    this.dataMode = false;
    this.pendingCommand = null;
    this.pendingArgs = [];
    this.frame = 0;
  }

  setPowered(powered: boolean): void {
    this.powered = powered;

    if (!powered) {
      this.displayOn = false;
    }
  }

  acceptsI2cAddress(address: number): boolean {
    return (address & 0x7f) === (this.i2cAddress & 0x7f);
  }

  getState(): Ssd1306RuntimeState {
    return {
      id: this.id,
      width: 128,
      height: 64,
      pixels: this.renderPixels(),
      displayOn: this.displayOn,
      invert: this.invert,
      contrast: this.contrast,
      i2cAddress: this.i2cAddress,
      powered: this.powered,
      frame: this.frame,
    };
  }

  beginI2cTransaction(): void {
    this.controlPending = true;
    this.dataMode = false;
    this.pendingCommand = null;
    this.pendingArgs = [];
  }

  processI2cByte(value: number): void {
    const byte = value & 0xff;

    if (this.controlPending) {
      /*
       * SSD1306 I2C control byte:
       *   0x00 / 0x80 -> command
       *   0x40 / 0xC0 -> data
       *
       * The Co bit is not required for the common Arduino libraries;
       * the D/C# bit is the important part for this device model.
       */
      this.dataMode = (byte & 0x40) !== 0;
      this.controlPending = false;
      return;
    }

    if (this.dataMode) {
      this.writeDisplayData(byte);
      return;
    }

    this.writeCommand(byte);
  }

  endI2cTransaction(): void {
    this.controlPending = true;
    this.dataMode = false;
    this.pendingCommand = null;
    this.pendingArgs = [];
  }

  private writeCommand(command: number): void {
    const cmd = command & 0xff;

    if (this.pendingCommand !== null) {
      this.pendingArgs.push(cmd);

      if (
        this.pendingArgs.length >=
        this.commandArgumentCount(this.pendingCommand)
      ) {
        this.applyCommand(
          this.pendingCommand,
          this.pendingArgs,
        );

        this.pendingCommand = null;
        this.pendingArgs = [];
      }

      return;
    }

    if (this.isArgumentCommand(cmd)) {
      this.pendingCommand = cmd;
      this.pendingArgs = [];
      return;
    }

    this.applyCommand(cmd, []);
  }

  private isArgumentCommand(command: number): boolean {
    switch (command & 0xff) {
      case 0x20:
      case 0x21:
      case 0x22:
      case 0x26:
      case 0x27:
      case 0x29:
      case 0x2a:
      case 0x81:
      case 0xa8:
      case 0xd3:
      case 0xd5:
      case 0xd9:
      case 0xda:
      case 0xdb:
      case 0x8d:
        return true;
      default:
        return false;
    }
  }

  private commandArgumentCount(command: number): number {
    switch (command & 0xff) {
      case 0x21:
      case 0x22:
        return 2;

      case 0x26:
      case 0x27:
        return 6;

      case 0x29:
      case 0x2a:
        return 5;

      default:
        return 1;
    }
  }

  private applyCommand(
    command: number,
    args: number[],
  ): void {
    const cmd = command & 0xff;

    switch (cmd) {
      case 0xae:
        this.displayOn = false;
        break;

      case 0xaf:
        this.displayOn = this.powered;
        break;

      case 0xa4:
        this.forceAllOn = false;
        break;

      case 0xa5:
        this.forceAllOn = true;
        break;

      case 0xa6:
        this.invert = false;
        this.forceAllOn = false;
        break;

      case 0xa7:
        this.invert = true;
        this.forceAllOn = false;
        break;

      case 0x20:
        const mode =
          (args[0] ?? 2) & 0x03;
        this.memoryMode =
          mode === 0 || mode === 1 || mode === 2
            ? mode
            : 2;
        if (this.memoryMode > 2) {
          this.memoryMode = 2;
        }
        break;

      case 0x21:
        this.columnStart =
          Math.max(0, Math.min(127, args[0] ?? 0));
        this.columnEnd =
          Math.max(
            this.columnStart,
            Math.min(127, args[1] ?? 127),
          );
        this.column = this.columnStart;
        break;

      case 0x22:
        this.pageStart =
          Math.max(0, Math.min(7, args[0] ?? 0));
        this.pageEnd =
          Math.max(
            this.pageStart,
            Math.min(7, args[1] ?? 7),
          );
        this.page = this.pageStart;
        break;

      case 0x81:
        this.contrast =
          Math.max(0, Math.min(255, args[0] ?? 0x7f));
        break;

      case 0xa8:
        // MUX ratio is relevant to hardware scan timing, not GDDRAM.
        break;

      case 0xd3:
        // Display offset affects scan timing; framebuffer coordinates
        // remain controller-relative.
        break;

      case 0xd5:
      case 0xd9:
      case 0xda:
      case 0xdb:
      case 0x8d:
        break;

      default:
        if (cmd >= 0x40 && cmd <= 0x7f) {
          this.startLine = cmd & 0x3f;
        } else if (cmd >= 0xb0 && cmd <= 0xb7) {
          this.page = cmd & 0x07;
        } else if (cmd >= 0x00 && cmd <= 0x0f) {
          this.column =
            (this.column & 0xf0) | (cmd & 0x0f);
        } else if (cmd >= 0x10 && cmd <= 0x1f) {
          this.column =
            ((cmd & 0x0f) << 4) |
            (this.column & 0x0f);
        } else if (cmd === 0xa0) {
          this.segmentRemap = false;
        } else if (cmd === 0xa1) {
          this.segmentRemap = true;
        } else if (cmd === 0xc0) {
          this.comScanReverse = false;
        } else if (cmd === 0xc8) {
          this.comScanReverse = true;
        } else if (cmd === 0x2e) {
          // Stop scrolling.
        } else if (cmd === 0x2f) {
          // Start scrolling is a display effect, not a RAM mutation.
        }
        break;
    }

  }

  private writeDisplayData(value: number): void {
    if (!this.powered) {
      return;
    }

    const page = Math.max(0, Math.min(7, this.page));
    const column = Math.max(0, Math.min(127, this.column));

    this.framebuffer[page * 128 + column] = value & 0xff;

    this.advanceAddress();
    this.frame += 1;
  }

  private advanceAddress(): void {
    switch (this.memoryMode) {
      case 0:
        this.column += 1;

        if (this.column > this.columnEnd) {
          this.column = this.columnStart;
          this.page += 1;

          if (this.page > this.pageEnd) {
            this.page = this.pageStart;
          }
        }
        break;

      case 1:
        this.page += 1;

        if (this.page > this.pageEnd) {
          this.page = this.pageStart;
          this.column += 1;

          if (this.column > this.columnEnd) {
            this.column = this.columnStart;
          }
        }
        break;

      case 2:
      default:
        this.column += 1;

        if (this.column > this.columnEnd) {
          this.column = this.columnStart;
        }
        break;
    }
  }

  private renderPixels(): number[] {
    const pixels = new Array<number>(128 * 64).fill(0);

    if (!this.powered || !this.displayOn) {
      return pixels;
    }

    const allOn = this.forceAllOn;

    for (let page = 0; page < 8; page += 1) {
      for (let col = 0; col < 128; col += 1) {
        const byte =
          allOn
            ? 0xff
            : this.framebuffer[page * 128 + col];

        for (let bit = 0; bit < 8; bit += 1) {
          const sourceX =
            this.segmentRemap
              ? 127 - col
              : col;

          let sourceY =
            page * 8 + bit;

          sourceY =
            this.comScanReverse
              ? 63 - sourceY
              : sourceY;

          const y =
            (sourceY + this.startLine) & 0x3f;

          if (sourceX < 0 || sourceX >= 128) {
            continue;
          }

          let on =
            ((byte >> bit) & 1) !== 0;

          if (this.invert) {
            on = !on;
          }

          pixels[y * 128 + sourceX] = on ? 1 : 0;
        }
      }
    }

    return pixels;
  }
}

export class Ssd1306I2cEventHandler
  implements TWIEventHandler {
  private selected: Ssd1306Runtime | null = null;

  constructor(
    private readonly displays: () => Ssd1306Runtime[],
    private readonly twi: AVRTWI,
    private readonly canConnect?: (
      display: Ssd1306Runtime,
    ) => boolean,
  ) {}

  start(): void {
    this.selected = null;
    this.twi.completeStart();

    for (const display of this.displays()) {
      display.beginI2cTransaction();
    }
  }

  stop(): void {
    this.selected?.endI2cTransaction();
    this.selected = null;
    this.twi.completeStop();
  }

  connectToSlave(
    addr: number,
    write: boolean,
  ): void {
    const display = this.displays().find(
      (item) =>
        item.acceptsI2cAddress(addr) &&
        (this.canConnect
          ? this.canConnect(item)
          : true),
    );

    this.selected = display ?? null;

    this.twi.completeConnect(
      Boolean(this.selected && write),
    );
  }

  writeByte(value: number): void {
    if (this.selected) {
      this.selected.processI2cByte(value);
    }

    this.twi.completeWrite(
      this.selected !== null,
    );
  }

  readByte(): void {
    this.twi.completeRead(0);
  }
}


export type I2cPeripheral =
  | Lcd1602Runtime
  | Ssd1306Runtime;

export class I2cPeripheralEventHandler
  implements TWIEventHandler {
  private selected: I2cPeripheral | null = null;

  constructor(
    private readonly displays: () => I2cPeripheral[],
    private readonly twi: AVRTWI,
    private readonly canConnect?: (
      display: I2cPeripheral,
    ) => boolean,
  ) {}

  start(): void {
    this.selected = null;
    this.twi.completeStart();

    for (const display of this.displays()) {
      if (display instanceof Ssd1306Runtime) {
        display.beginI2cTransaction();
      }
    }
  }

  stop(): void {
    if (this.selected instanceof Ssd1306Runtime) {
      this.selected.endI2cTransaction();
    } else if (this.selected instanceof Lcd1602Runtime) {
      // LCD keeps its own transaction state inside the existing model.
    }

    this.selected = null;
    this.twi.completeStop();
  }

  connectToSlave(
    addr: number,
    write: boolean,
  ): void {
    const display = this.displays().find(
      (item) =>
        (
          item instanceof Ssd1306Runtime
            ? item.acceptsI2cAddress(addr)
            : item.acceptsI2cAddress(addr)
        ) &&
        (this.canConnect
          ? this.canConnect(item)
          : true),
    );

    this.selected = display ?? null;

    this.twi.completeConnect(
      Boolean(this.selected && write),
    );
  }

  writeByte(value: number): void {
    if (this.selected instanceof Ssd1306Runtime) {
      this.selected.processI2cByte(value);
    } else if (this.selected instanceof Lcd1602Runtime) {
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
