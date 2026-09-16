// =====================================================
// RUNTIME COMPONENT
// =====================================================

export abstract class RuntimeComponent {
  public readonly id: string;

  public readonly type: string;

  constructor(
    id: string,
    type: string
  ) {
    this.id = id;
    this.type = type;
  }

  /**
   * Called every simulation update.
   */
  abstract update(): void;

  /**
   * Reset component state.
   */
  abstract reset(): void;
}