import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class ContinueQuery1773446400006 implements MigrationInterface {
  name = 'ContinueQuery1773446400006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      ALTER TABLE "game_matches"
      ALTER COLUMN "turnTimerSeconds" SET DEFAULT 30,
      ALTER COLUMN "turnTimerSeconds" SET NOT NULL
    `);

    await runner.query(`
      ALTER TABLE "game_matches"
      DROP COLUMN IF EXISTS "setupTimerSeconds"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      ALTER TABLE "game_matches"
      ALTER COLUMN "setupTimerSeconds" SET DEFAULT 60,
      ALTER COLUMN "setupTimerSeconds" SET NOT NULL
    `);
  }
}
