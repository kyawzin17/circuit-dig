// =====================================================
// SIMULATOR TYPES
// =====================================================

export type SimulationStatus =
  | "idle"
  | "compiling"
  | "running"
  | "paused"
  | "stopped"
  | "error";

// =====================================================
// PIN LEVEL
// =====================================================

export type PinLevel = 0 | 1;

// =====================================================
// PIN MODE
// =====================================================

export type PinMode =
  | "input"
  | "output"
  | "input_pullup";

// =====================================================
// POWER SYSTEM
// =====================================================

export type ArduinoPowerRailName =
  | "5V"
  | "3.3V"
  | "IOREF"
  | "GND"
  | "VIN";

export interface ArduinoPowerRailState {
  name: ArduinoPowerRailName;
  voltage: number;
  enabled: boolean;
  direction: "source" | "reference" | "ground" | "input";
  maxCurrentMa?: number;
}

export interface ArduinoPowerPinVoltage {
  pin: string;
  voltage: number;
  rail: ArduinoPowerRailName;
}

// =====================================================
// RUNTIME PIN
// =====================================================

export interface RuntimePin {
  pin: number;
  mode: PinMode;
  level: PinLevel;
  pwmDuty?: number;
  analogValue?: number;
}

// =====================================================
// RUNTIME COMPONENT
// =====================================================

export interface RuntimeComponent {
  id: string;
  type: string;
  update(): void;
  reset(): void;
}

// =====================================================
// LED RUNTIME STATE
// =====================================================

export interface LedRuntimeState {
  id: string;
  isOn: boolean;
  brightness?: number;
  color?: string;
}

// =====================================================
// RESISTOR RUNTIME STATE
// =====================================================

export interface ResistorRuntimeState {
  id: string;
  resistance: number;
  unit?: "Ω" | "kΩ" | "MΩ";
}

export interface SevenSegmentRuntimeState {
  id: string;
  digits: number;
  common: "anode" | "cathode";
  /**
   * Segment states in A,B,C,D,E,F,G,DP order.
   * For multi-digit displays the arrays are concatenated
   * digit-by-digit in DIG1..DIG4 order.
   */
  values: number[];
  colon: boolean;
}

export interface BuzzerRuntimeState {
  id: string;
  active: boolean;
  currentMa?: number;
  frequencyHz?: number;
  dutyCycle?: number;
}

export interface UltrasonicRuntimeState {
  id: string;
  distanceCm: number;
  echoHigh: boolean;
  triggerActive: boolean;
  echoPulseUs?: number;
}

// =====================================================
// WIRE RUNTIME STATE
// =====================================================

/**
 * Visual/electrical state for a physical wire.
 *
 * isActive means the current-flow solver found this
 * wire on a valid source -> component -> GND path.
 *
 * It is deliberately separate from a voltage level:
 * a HIGH net can exist without current flowing.
 */
export interface WireRuntimeState {
  isActive: boolean;
  currentMa?: number;
  netId?: string;
}

// =====================================================
// ARDUINO UNO RUNTIME
// =====================================================

export interface SimulationPinMeasurement {
  pin: string;
  voltage?: number;
  currentMa?: number;
  digitalLevel?: PinLevel;
  mode?: PinMode;
}

export interface SimulationNetMeasurement {
  netId: string;
  voltage?: number;
  currentMa?: number;
  active: boolean;
  pins: string[];
}

export interface SimulationComponentMeasurement {
  id: string;
  type: string;
  voltageDrop?: number;
  currentMa?: number;
  powerMw?: number;
  active: boolean;
}

export type SimulationTraceKind =
  | "pin"
  | "net"
  | "component"
  | "fault";

export interface SimulationTraceStep {
  kind: SimulationTraceKind;
  id: string;
  label: string;
  voltage?: number;
  currentMa?: number;
  active?: boolean;
}

export interface SimulationTrace {
  target: string;
  status: "complete" | "blocked" | "floating";
  summary: string;
  steps: SimulationTraceStep[];
  netIds: string[];
  componentIds: string[];
  faults: string[];
}

export interface SimulationDiagnostics {
  simulatedCycles: number;
  simulatedMs: number;
  frameCount: number;
  pins: SimulationPinMeasurement[];
  nets: SimulationNetMeasurement[];
  components: SimulationComponentMeasurement[];
  faults: string[];
  trace?: SimulationTrace;
}

export interface ArduinoUnoRuntimeState {
  digitalPins: Record<number, RuntimePin>;

  powerRails: Record<
    ArduinoPowerRailName,
    ArduinoPowerRailState
  >;

  pinVoltages: Record<string, ArduinoPowerPinVoltage>;

  /**
   * Resolved analog input state in volts and 10-bit ADC units.
   * Values are produced by the electrical solver, not by
   * calling analogRead() from JavaScript.
   */
  analogPinVoltages: Record<string, number>;
  analogPinValues: Record<string, number>;

  /** Resolved analog/digital sensor values used by the runtime. */
  sensorPinVoltages?: Record<string, number>;
  sensorDigitalOutputs?: Record<string, 0 | 1>;

  ledStates: Record<string, LedRuntimeState>;

  resistorStates: Record<string, ResistorRuntimeState>;

  sevenSegmentStates: Record<string, SevenSegmentRuntimeState>;

  buzzerStates: Record<string, BuzzerRuntimeState>;

  ultrasonicStates: Record<string, UltrasonicRuntimeState>;

  wireStates: Record<string, WireRuntimeState>;

  diagnostics: SimulationDiagnostics;
}

// =====================================================
// SIMULATION RESULT
// =====================================================

export interface SimulationResult {
  success: boolean;

  status: SimulationStatus;

  message?: string;

  ledStates?: Record<string, LedRuntimeState>;

  wireStates?: Record<string, WireRuntimeState>;
}

// =====================================================
// SIMULATION CONFIG
// =====================================================

export interface SimulationConfig {
  frequency?: number;

  maxCycles?: number;

  debug?: boolean;
}

// =====================================================
// SIMULATION ENGINE
// =====================================================

export interface SimulationEngineOptions {
  config?: SimulationConfig;

  onStateChange?: (
    state: ArduinoUnoRuntimeState
  ) => void;

  onError?: (
    error: Error
  ) => void;
}
