import { AVRTWI, type TWIEventHandler } from "avr8js";
import { Lcd1602Runtime } from "./Lcd1602Runtime";
import { Ds1307Runtime } from "./Ds1307Runtime";

/**
 * Shared AVR TWI bus for I2C peripherals.
 *
 * The AVR sees one physical I2C bus, so the simulator uses one event
 * handler and selects the addressed device for each START/address phase.
 * LCD1602 keeps its existing write-only behavior; DS1307 implements the
 * full register read/write path required by Wire/RTClib.
 */
export class I2cPeripheralEventHandler implements TWIEventHandler {
  private selected:
    | { kind: "lcd"; device: Lcd1602Runtime }
    | { kind: "ds1307"; device: Ds1307Runtime }
    | null = null;

  private ds1307FirstWriteByte = false;

  constructor(
    private readonly displays: () => Lcd1602Runtime[],
    private readonly twi: AVRTWI,
    private readonly canConnectLcd?: (
      display: Lcd1602Runtime,
    ) => boolean,
    private readonly ds1307s: () => Ds1307Runtime[] = () => [],
    private readonly canConnectDs1307?: (
      rtc: Ds1307Runtime,
    ) => boolean,
  ) {}

  start(): void {
    this.selected = null;
    this.ds1307FirstWriteByte = false;
    this.twi.completeStart();
  }

  stop(): void {
    this.selected = null;
    this.ds1307FirstWriteByte = false;
    this.twi.completeStop();
  }

  connectToSlave(addr: number, write: boolean): void {
    this.selected = null;
    this.ds1307FirstWriteByte = false;

    const rtc = this.ds1307s().find(
      (candidate) =>
        candidate.acceptsI2cAddress(addr) &&
        (this.canConnectDs1307
          ? this.canConnectDs1307(candidate)
          : candidate.isPowered()),
    );

    if (rtc) {
      this.selected = {
        kind: "ds1307",
        device: rtc,
      };
      this.ds1307FirstWriteByte = write;
    } else {
      const display = this.displays().find(
        (item) =>
          item.acceptsI2cAddress(addr) &&
          (this.canConnectLcd
            ? this.canConnectLcd(item)
            : true),
      );

      if (display) {
        this.selected = {
          kind: "lcd",
          device: display,
        };
      }
    }

    /*
     * A slave must ACK both SLA+W and SLA+R.
     * DS1307 uses SLA+W to set the register pointer and a repeated
     * START + SLA+R to read the selected register bytes.
     */
    this.twi.completeConnect(Boolean(this.selected));
  }

  writeByte(value: number): void {
    if (!this.selected) {
      this.twi.completeWrite(false);
      return;
    }

    if (this.selected.kind === "lcd") {
      this.selected.device.processI2cExpanderByte(value);
    } else if (this.ds1307FirstWriteByte) {
      this.selected.device.setRegisterPointer(value);
      this.ds1307FirstWriteByte = false;
    } else {
      this.selected.device.writeByte(value);
    }

    this.twi.completeWrite(true);
  }

  readByte(): void {
    if (
      this.selected &&
      this.selected.kind === "ds1307"
    ) {
      this.twi.completeRead(
        this.selected.device.readByte(),
      );
      return;
    }

    this.twi.completeRead(0);
  }
}
