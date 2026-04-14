import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class AddUserRole1773446400008 implements MigrationInterface {
  name = 'AddUserRole1773446400008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);
    await runner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "role" character varying(20) NOT NULL DEFAULT 'USER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);
    await runner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "role"
    `);
  }
}
