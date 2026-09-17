import type {
  PinLevel,
} from "../types/simulator.types";

export interface LedRuntimeConfig {
  id: string;

  anodePinId: string;

  cathodePinId: string;
}

export interface LedRuntimeInput {
  anodeLevel: PinLevel;

  cathodeLevel: PinLevel;
}

export interface LedRuntimeState {
  id: string;

  isOn: boolean;

  brightness: number;
}

export class LedRuntime {
  private readonly config:
    LedRuntimeConfig;

  private state:
    LedRuntimeState;

  constructor(
    config: LedRuntimeConfig,
  ) {
    this.config = config;

    this.state = {
      id: config.id,

      isOn: false,

      brightness: 0,
    };
  }

  update(
    input: LedRuntimeInput,
  ): void {
    const forwardBiased =
      input.anodeLevel === 1 &&
      input.cathodeLevel === 0;

    this.state.isOn =
      forwardBiased;

    this.state.brightness =
      forwardBiased
        ? 1
        : 0;
  }

  getState():
    LedRuntimeState {
    return {
      ...this.state,
    };
  }

  reset(): void {
    this.state = {
      id: this.config.id,

      isOn: false,

      brightness: 0,
    };
  }
}