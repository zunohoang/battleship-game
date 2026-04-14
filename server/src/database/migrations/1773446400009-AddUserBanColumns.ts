import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class AddUserBanColumns1773446400009 implements MigrationInterface {
  name = 'AddUserBanColumns1773446400009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);
    await runner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "bannedPermanent" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "banReason" character varying(500),
      ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);
    await runner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "bannedAt",
      DROP COLUMN IF EXISTS "banReason",
      DROP COLUMN IF EXISTS "bannedPermanent",
      DROP COLUMN IF EXISTS "bannedUntil"
    `);
  }
}
