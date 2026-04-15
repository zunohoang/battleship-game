import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminActorColumnsForAudit1773446400012
  implements MigrationInterface
{
  name = 'AddAdminActorColumnsForAudit1773446400012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "banActorId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "forum_posts"
      ADD COLUMN IF NOT EXISTS "archivedByAdminId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "game_matches"
      ADD COLUMN IF NOT EXISTS "adminActorId" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_matches"
      DROP COLUMN IF EXISTS "adminActorId"
    `);

    await queryRunner.query(`
      ALTER TABLE "forum_posts"
      DROP COLUMN IF EXISTS "archivedByAdminId"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "banActorId"
    `);
  }
}
