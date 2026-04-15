import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEloAndMatchEloSettled1773446400007
  implements MigrationInterface
{
  name = 'AddUserEloAndMatchEloSettled1773446400007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "elo" integer NOT NULL DEFAULT 800
    `);
    await queryRunner.query(`
      ALTER TABLE "game_matches"
      ADD COLUMN IF NOT EXISTS "eloSettled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_matches" DROP COLUMN IF EXISTS "eloSettled"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "elo"
    `);
  }
}
