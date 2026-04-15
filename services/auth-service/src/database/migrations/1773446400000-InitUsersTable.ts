import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class InitUsersTable1773446400000 implements MigrationInterface {
  name = 'InitUsersTable1773446400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "username" character varying(20) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "avatar" text,
        "signature" character varying(200),
        "refreshTokenHash" text,
        "refreshTokenAbsoluteExpiry" bigint,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username")
      )
    `);

    await runner.query('CREATE INDEX "IDX_users_email" ON "users" ("email")');
    await runner.query(
      'CREATE INDEX "IDX_users_username" ON "users" ("username")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query('DROP INDEX "public"."IDX_users_username"');
    await runner.query('DROP INDEX "public"."IDX_users_email"');
    await runner.query('DROP TABLE "users"');
  }
}
