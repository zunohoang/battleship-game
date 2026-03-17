import { MigrationInterface } from 'typeorm';

export class AddTurnTimerSecondsToMatches1773446400004 implements MigrationInterface {
  name = 'AddTurnTimerSecondsToMatches1773446400004';

  public async up(): Promise<void> {
    // No-op: pending migration retained to preserve sequence.
  }

  public async down(): Promise<void> {
    // No-op: pending migration retained to preserve sequence.
  }
}
