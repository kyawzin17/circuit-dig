export interface PotentiometerRuntimeState {
  id: string;
  position: number;
  vccVoltage: number;
  gndVoltage: number;
  signalVoltage: number;
}

export class PotentiometerRuntime {
  static clampPosition(position: number): number {
    return Math.max(0, Math.min(1, position));
  }

  static getSignalVoltage(
    position: number,
    vccVoltage: number,
    gndVoltage: number,
  ): number {
    const normalized =
      PotentiometerRuntime.clampPosition(position);

    return (
      gndVoltage +
      (vccVoltage - gndVoltage) * normalized
    );
  }
}
