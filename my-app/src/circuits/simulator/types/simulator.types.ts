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
// RUNTIME PIN
// =====================================================

export interface RuntimePin {
  pin: number;
  mode: PinMode;
  level: PinLevel;
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

export interface ArduinoUnoRuntimeState {
  digitalPins: Record<number, RuntimePin>;

  ledStates: Record<string, LedRuntimeState>;

  resistorStates: Record<string, ResistorRuntimeState>;

  wireStates: Record<string, WireRuntimeState>;
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
