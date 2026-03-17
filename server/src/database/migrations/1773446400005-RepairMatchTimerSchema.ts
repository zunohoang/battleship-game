import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class RepairMatchTimerSchema1773446400005 implements MigrationInterface {
  name = 'RepairMatchTimerSchema1773446400005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      ALTER TABLE "game_matches"
      ADD COLUMN IF NOT EXISTS "turnDeadlineAt" TIMESTAMP WITH TIME ZONE
    `);

    await runner.query(`
      ALTER TABLE "game_matches"
      ADD COLUMN IF NOT EXISTS "turnTimerSeconds" integer
    `);

    await runner.query(`
      UPDATE "game_matches"
      SET "turnTimerSeconds" = COALESCE(
        "turnTimerSeconds",
        "setupTimerSeconds",
        30
      )
    `);

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
      ADD COLUMN IF NOT EXISTS "setupTimerSeconds" integer
    `);

    await runner.query(`
      UPDATE "game_matches"
      SET "setupTimerSeconds" = COALESCE(
        "setupTimerSeconds",
        "turnTimerSeconds",
        60
      )
    `);

    await runner.query(`
      ALTER TABLE "game_matches"
      ALTER COLUMN "setupTimerSeconds" SET DEFAULT 60,
      ALTER COLUMN "setupTimerSeconds" SET NOT NULL
    `);

    await runner.query(`
      ALTER TABLE "game_matches"
      DROP COLUMN IF EXISTS "turnDeadlineAt"
    `);
  }
}
