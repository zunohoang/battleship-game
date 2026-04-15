import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomCloseTargetUserId1773446400011 implements MigrationInterface {
  name = 'AddRoomCloseTargetUserId1773446400011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_rooms"
      ADD COLUMN IF NOT EXISTS "closeReasonTargetUserId" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "game_rooms"
      DROP COLUMN IF EXISTS "closeReasonTargetUserId"
    `);
  }
}
