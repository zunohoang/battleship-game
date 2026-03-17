import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class AddTurnTimerSecondsToMatches1773446400003 implements MigrationInterface {
  name = 'AddTurnTimerSecondsToMatches1773446400003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      ALTER TABLE "game_matches"
      ADD COLUMN IF NOT EXISTS "turnTimerSeconds" integer NOT NULL DEFAULT 30
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      ALTER TABLE "game_matches"
      DROP COLUMN IF EXISTS "turnTimerSeconds"
    `);
  }
}
