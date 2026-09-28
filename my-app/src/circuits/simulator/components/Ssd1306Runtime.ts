export interface Ssd1306RuntimeState {
  id: string;
  width: 128;
  height: 64;
  pixels: number[];
  displayOn: boolean;
  invert: boolean;
  contrast: number;
  interfaceType: "spi";
  powered: boolean;
  frame: number;
}

/**
 * Functional SSD1306 128x64 controller for the simulator's 8-pin SPI
 * breakout. The AVR firmware is the source of truth: hardware SPI bytes
 * arrive through AVRSPI and software-SPI bytes are decoded from real GPIO
 * edges by SimulationEngine.
 *
 * SPI mode 0:
 *   DATA = MOSI / D1
 *   CLK  = SCK  / D0
 *   DC   = 0 command, 1 data
 *   CS   = active low
 *   RST  = active low
 */
export class Ssd1306Runtime {
  private readonly framebuffer = new Uint8Array(128 * 8);

  private displayOn = false;
  private invert = false;
  private forceAllOn = false;
  private contrast = 0x7f;
  private powered = false;
  private resetActive = true;

  private memoryMode: 0 | 1 | 2 = 2;
  private column = 0;
  private page = 0;
  private columnStart = 0;
  private columnEnd = 127;
  private pageStart = 0;
  private pageEnd = 7;
  private startLine = 0;
  private segmentRemap = false;
  private comScanReverse = false;

  private pendingCommand: number | null = null;
  private pendingArgs: number[] = [];
  private frame = 0;

  constructor(public readonly id: string) {
    this.reset();
  }

  reset(): void {
    this.framebuffer.fill(0);
    this.displayOn = false;
    this.invert = false;
    this.forceAllOn = false;
    this.contrast = 0x7f;
    this.powered = false;
    this.resetActive = true;

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

  setReset(level: 0 | 1): void {
    if (level === 0) {
      if (!this.resetActive) {
        this.resetController();
      } else {
        this.displayOn = false;
      }
      this.resetActive = true;
      return;
    }

    if (this.resetActive) {
      this.resetActive = false;
      this.displayOn = false;
    }
  }

  processSpiByte(value: number, dataMode: boolean): void {
    if (!this.powered || this.resetActive) {
      return;
    }

    const byte = value & 0xff;

    if (dataMode) {
      this.writeDisplayData(byte);
      return;
    }

    this.writeCommand(byte);
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
      interfaceType: "spi",
      powered: this.powered,
      frame: this.frame,
    };
  }

  private resetController(): void {
    this.framebuffer.fill(0);
    this.displayOn = false;
    this.invert = false;
    this.forceAllOn = false;
    this.contrast = 0x7f;
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
    this.pendingCommand = null;
    this.pendingArgs = [];
    this.frame += 1;
  }

  private writeCommand(command: number): void {
    const cmd = command & 0xff;

    if (this.pendingCommand !== null) {
      this.pendingArgs.push(cmd);

      if (this.pendingArgs.length >= this.commandArgumentCount(this.pendingCommand)) {
        this.applyCommand(this.pendingCommand, this.pendingArgs);
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

  private applyCommand(command: number, args: number[]): void {
    const cmd = command & 0xff;

    switch (cmd) {
      case 0xae:
        this.displayOn = false;
        break;

      case 0xaf:
        this.displayOn = this.powered && !this.resetActive;
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

      case 0x20: {
        const mode = (args[0] ?? 2) & 0x03;
        this.memoryMode = mode === 0 || mode === 1 || mode === 2 ? mode : 2;
        break;
      }

      case 0x21:
        this.columnStart = Math.max(0, Math.min(127, args[0] ?? 0));
        this.columnEnd = Math.max(this.columnStart, Math.min(127, args[1] ?? 127));
        this.column = this.columnStart;
        break;

      case 0x22:
        this.pageStart = Math.max(0, Math.min(7, args[0] ?? 0));
        this.pageEnd = Math.max(this.pageStart, Math.min(7, args[1] ?? 7));
        this.page = this.pageStart;
        break;

      case 0x81:
        this.contrast = Math.max(0, Math.min(255, args[0] ?? 0x7f));
        break;

      case 0xa8:
      case 0xd3:
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
        } else if (cmd <= 0x0f) {
          this.column = (this.column & 0xf0) | (cmd & 0x0f);
        } else if (cmd >= 0x10 && cmd <= 0x1f) {
          this.column = ((cmd & 0x0f) << 4) | (this.column & 0x0f);
        } else if (cmd === 0xa0) {
          this.segmentRemap = false;
        } else if (cmd === 0xa1) {
          this.segmentRemap = true;
        } else if (cmd === 0xc0) {
          this.comScanReverse = false;
        } else if (cmd === 0xc8) {
          this.comScanReverse = true;
        }
        break;
    }
  }

  private writeDisplayData(value: number): void {
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
          if (this.page > this.pageEnd) this.page = this.pageStart;
        }
        break;

      case 1:
        this.page += 1;
        if (this.page > this.pageEnd) {
          this.page = this.pageStart;
          this.column += 1;
          if (this.column > this.columnEnd) this.column = this.columnStart;
        }
        break;

      default:
        this.column += 1;
        if (this.column > this.columnEnd) this.column = this.columnStart;
        break;
    }
  }

  private renderPixels(): number[] {
    const pixels = new Array<number>(128 * 64).fill(0);

    if (!this.powered || !this.displayOn) {
      return pixels;
    }

    for (let page = 0; page < 8; page += 1) {
      for (let col = 0; col < 128; col += 1) {
        const byte = this.forceAllOn ? 0xff : this.framebuffer[page * 128 + col];

        for (let bit = 0; bit < 8; bit += 1) {
          const sourceX = this.segmentRemap ? 127 - col : col;
          const sourceY = this.comScanReverse
            ? 63 - (page * 8 + bit)
            : page * 8 + bit;
          const y = (sourceY + this.startLine) & 0x3f;

          let on = ((byte >> bit) & 1) !== 0;
          if (this.invert) on = !on;

          pixels[y * 128 + sourceX] = on ? 1 : 0;
        }
      }
    }

    return pixels;
  }
}

/**
 * Hardware-SPI bridge. AVRSPI calls onByte() whenever firmware writes SPDR.
 * The engine supplies the current Arduino GPIO levels so CS/DC remain
 * ordinary, firmware-controlled pins exactly like the physical breakout.
 */
export class Ssd1306SpiBridge {
  constructor(
    private readonly displays: () => Ssd1306Runtime[],
    private readonly getPinLevel: (pin: string) => 0 | 1,
    private readonly getConnectedPin: (
      display: Ssd1306Runtime,
      terminal: string,
    ) => string | null,
  ) {}

  transfer(value: number): number {
    for (const display of this.displays()) {
      const csPin = this.getConnectedPin(display, "CS");
      const dcPin = this.getConnectedPin(display, "DC");

      if (!csPin || !dcPin) continue;
      if (this.getPinLevel(csPin) !== 0) continue;

      const powered = display.getState().powered;
      if (!powered) continue;

      display.processSpiByte(
        value,
        this.getPinLevel(dcPin) === 1,
      );
    }

    // SSD1306 is write-only for this simulator model.
    return 0;
  }
}

/**
 * Software-SPI decoder for the same 8-pin breakout.
 * Adafruit's bit-banged constructor uses SPI mode 0: sample MOSI on the
 * rising edge of SCK, MSB first, while CS is LOW.
 */
export class Ssd1306SoftwareSpiDecoder {
  private readonly state = new Map<string, {
    bits: number;
    value: number;
    lastClock: 0 | 1;
  }>();

  constructor(
    private readonly displays: () => Ssd1306Runtime[],
    private readonly getPinLevel: (pin: string) => 0 | 1,
    private readonly getConnectedPin: (
      display: Ssd1306Runtime,
      terminal: string,
    ) => string | null,
  ) {}

  reset(): void {
    this.state.clear();
  }

  handleGpioChange(
    changedPin: string,
    level: 0 | 1,
  ): void {
    const pin = changedPin.toUpperCase();

    for (const display of this.displays()) {
      const csPin = this.getConnectedPin(display, "CS");
      const dcPin = this.getConnectedPin(display, "DC");
      const dataPin = this.getConnectedPin(display, "DATA");
      const clockPin = this.getConnectedPin(display, "CLK");

      if (!csPin || !dcPin || !dataPin || !clockPin) continue;
      if (pin !== clockPin.toUpperCase()) continue;

      const state = this.state.get(display.id) ?? {
        bits: 0,
        value: 0,
        lastClock: 0 as 0 | 1,
      };

      if (level === 1 && state.lastClock === 0) {
        if (this.getPinLevel(csPin) === 0 && display.getState().powered) {
          state.value = ((state.value << 1) | this.getPinLevel(dataPin)) & 0xff;
          state.bits += 1;

          if (state.bits === 8) {
            display.processSpiByte(
              state.value,
              this.getPinLevel(dcPin) === 1,
            );
            state.bits = 0;
            state.value = 0;
          }
        }
      }

      state.lastClock = level;
      this.state.set(display.id, state);
    }
  }
}
