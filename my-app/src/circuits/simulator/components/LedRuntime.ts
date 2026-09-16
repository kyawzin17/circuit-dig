import { RuntimeComponent } from "./RuntimeComponent";

export interface LedRuntimeOptions {
  pin: number;

  color?: string;
}

// =====================================================
// LED RUNTIME
// =====================================================

export class LedRuntime
  extends RuntimeComponent {

  public readonly pin: number;

  public readonly color: string;

  private on: boolean = false;

  constructor(
    id: string,
    options: LedRuntimeOptions
  ) {
    super(
      id,
      "led"
    );

    this.pin =
      options.pin;

    this.color =
      options.color ?? "#ff0000";
  }

  // ---------------------------------------------------
  // SET STATE
  // ---------------------------------------------------

  setState(
    value: boolean
  ): void {
    this.on = value;
  }

  // ---------------------------------------------------
  // GET STATE
  // ---------------------------------------------------

  isOn(): boolean {
    return this.on;
  }

  // ---------------------------------------------------
  // UPDATE
  // ---------------------------------------------------

  update(): void {
    // LED state will be
    // synchronized with Arduino pin.
  }

  // ---------------------------------------------------
  // RESET
  // ---------------------------------------------------

  reset(): void {
    this.on = false;
  }
}