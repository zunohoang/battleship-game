import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class AddSetupDeadlineToMatches1773446400002
  implements MigrationInterface
{
  name = 'AddSetupDeadlineToMatches1773446400002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);
    await runner.query(
      'ALTER TABLE "game_matches" ADD COLUMN "setupDeadlineAt" TIMESTAMP WITH TIME ZONE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);
    await runner.query(
      'ALTER TABLE "game_matches" DROP COLUMN "setupDeadlineAt"',
    );
  }
}
