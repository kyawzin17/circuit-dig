import { RuntimeComponent } from "./RuntimeComponent";

export interface ResistorRuntimeOptions {
  resistance: number;
}

// =====================================================
// RESISTOR RUNTIME
// =====================================================

export class ResistorRuntime
  extends RuntimeComponent {

  public resistance: number;

  constructor(
    id: string,
    options: ResistorRuntimeOptions
  ) {
    super(
      id,
      "resistor"
    );

    this.resistance =
      options.resistance;
  }

  // ---------------------------------------------------
  // UPDATE
  // ---------------------------------------------------

  update(): void {
    // Resistor simulation
    // will be implemented later.
  }

  // ---------------------------------------------------
  // RESET
  // ---------------------------------------------------

  reset(): void {
    // Reset resistor state.
  }
}