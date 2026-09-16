import {
  ArduinoUnoRuntime,
} from "../boards/ArduinoUnoRuntime";

import {
  Avr8jsRunner,
} from "./Avr8jsRunner";

import {
  SimulationClock,
} from "./SimulationClock";

import type {
  SimulationEngineOptions,
  SimulationStatus,
} from "../types/simulator.types";

export class SimulationEngine {
  private status: SimulationStatus = "idle";

  private readonly arduino: ArduinoUnoRuntime;
  private readonly avr: Avr8jsRunner;
  private readonly clock: SimulationClock;

  private readonly options: SimulationEngineOptions;

  constructor(
    options: SimulationEngineOptions = {}
  ) {
    this.options = options;

    this.arduino =
      new ArduinoUnoRuntime();

    this.avr =
      new Avr8jsRunner();

    this.clock =
      new SimulationClock();
  }

  // ===================================================
  // STATUS
  // ===================================================

  getStatus(): SimulationStatus {
    return this.status;
  }

  private setStatus(
    status: SimulationStatus
  ): void {
    this.status = status;

    this.options.onStateChange?.(
      this.arduino.getState()
    );
  }

  // ===================================================
  // START
  // ===================================================

  start(): void {
    if (this.clock.isRunning()) {
      return;
    }

    console.log(
      "[SimulationEngine] START"
    );

    this.setStatus("running");

    this.clock.start(() => {
      this.tick();
    });
  }

  // ===================================================
  // TICK
  // ===================================================

  private tick(): void {
    try {
      this.avr.runCycles(100);
    } catch {
      // AVR program မ load ရသေးရင်
      // simulation clock ကို မရပ်စေဘူး။
    }

    this.options.onStateChange?.(
      this.arduino.getState()
    );
  }

  // ===================================================
  // PAUSE
  // ===================================================

  pause(): void {
    this.clock.stop();

    this.setStatus("paused");
  }

  // ===================================================
  // STOP
  // ===================================================

  stop(): void {
    this.clock.stop();

    this.arduino.reset();

    this.setStatus("stopped");
  }

  // ===================================================
  // RESET
  // ===================================================

  reset(): void {
    this.clock.stop();

    this.arduino.reset();

    this.avr.reset();

    this.setStatus("idle");
  }

  // ===================================================
  // ARDUINO
  // ===================================================

  getArduino(): ArduinoUnoRuntime {
    return this.arduino;
  }

  // ===================================================
  // AVR
  // ===================================================

  getAvr(): Avr8jsRunner {
    return this.avr;
  }
}