// =====================================================
// SIMULATION CLOCK
// =====================================================

export class SimulationClock {

  private animationFrame:
    number | null = null;

  private running = false;

  // ===================================================
  // START
  // ===================================================

  start(
    callback: () => void
  ): void {

    if (this.running) {
      return;
    }

    this.running = true;

    const tick = () => {

      if (!this.running) {
        return;
      }

      callback();

      this.animationFrame =
        requestAnimationFrame(tick);
    };

    this.animationFrame =
      requestAnimationFrame(tick);
  }

  // ===================================================
  // STOP
  // ===================================================

  stop(): void {

    this.running = false;

    if (
      this.animationFrame !== null
    ) {
      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame = null;
    }
  }

  // ===================================================
  // IS RUNNING
  // ===================================================

  isRunning(): boolean {
    return this.running;
  }
}