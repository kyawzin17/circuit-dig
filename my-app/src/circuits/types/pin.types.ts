export type PinType =
  | "digital"
  | "analog"
  | "power"
  | "ground"
  | "terminal";


export type PinProtocol =
  | "uart"
  | "i2c"
  | "spi";


export type PinFeature =
  | "pwm"
  | "adc"
  | "interrupt"
  | "reset"
  | "built-in-led";


export type PinDirection =
  | "input"
  | "output"
  | "bidirectional"
  | "passive";


export type PinVoltage = {
  min?: number;

  max?: number;

  nominal?: number;

  unit: "V";
};


export type CircuitPin = {

  /**
   * Unique pin ID.
   *
   * Example:
   * D13
   * A0
   * GND
   * A
   * B
   */
  id: string;


  /**
   * Display label.
   */
  label: string;


  /**
   * Secondary display name.
   *
   * Example:
   * RX
   * TX
   * SDA
   * Terminal 1
   */
  alias?: string;


  /**
   * Pin category.
   */
  type: PinType;


  /**
   * Electrical direction.
   *
   * passive = resistor/capacitor/diode terminal
   * bidirectional = normal GPIO
   */
  direction?: PinDirection;


  /**
   * Communication protocols.
   */
  protocols?: PinProtocol[];


  /**
   * Pin capabilities.
   */
  features?: PinFeature[];


  /**
   * Voltage information.
   */
  voltage?: PinVoltage;


  /**
   * Maximum current.
   */
  maxCurrent?: {
    value: number;

    unit: "A" | "mA";
  };


  /**
   * Pin description.
   */
  description?: string;
};