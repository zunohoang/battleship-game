import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminInterventionColumns1773446400010
  implements MigrationInterface
{
  name = 'AddAdminInterventionColumns1773446400010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_rooms"
      ADD COLUMN IF NOT EXISTS "closeReasonCode" character varying(80),
      ADD COLUMN IF NOT EXISTS "closeReasonMessage" character varying(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "game_matches"
      ADD COLUMN IF NOT EXISTS "endedByAdmin" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "adminInterventionType" character varying(50),
      ADD COLUMN IF NOT EXISTS "adminInterventionReason" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_matches"
      DROP COLUMN IF EXISTS "adminInterventionReason",
      DROP COLUMN IF EXISTS "adminInterventionType",
      DROP COLUMN IF EXISTS "endedByAdmin"
    `);
    await queryRunner.query(`
      ALTER TABLE "game_rooms"
      DROP COLUMN IF EXISTS "closeReasonMessage",
      DROP COLUMN IF EXISTS "closeReasonCode"
    `);
  }
}
