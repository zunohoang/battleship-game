import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class InitGameTables1773446400001 implements MigrationInterface {
  name = 'InitGameTables1773446400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      CREATE TABLE "game_rooms" (
        "id" uuid NOT NULL,
        "code" character varying(8) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'waiting',
        "visibility" character varying(10) NOT NULL DEFAULT 'public',
        "ownerId" uuid NOT NULL,
        "guestId" uuid,
        "currentMatchId" uuid,
        "ownerReady" boolean NOT NULL DEFAULT false,
        "guestReady" boolean NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_rooms_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_game_rooms_code" UNIQUE ("code")
      )
    `);

    await runner.query(`
      CREATE TABLE "game_matches" (
        "id" uuid NOT NULL,
        "roomId" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'setup',
        "boardConfig" jsonb NOT NULL,
        "ships" jsonb NOT NULL,
        "player1Id" uuid NOT NULL,
        "player2Id" uuid NOT NULL,
        "player1Placements" jsonb,
        "player2Placements" jsonb,
        "player1Shots" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "player2Shots" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "turnPlayerId" uuid,
        "winnerId" uuid,
        "version" integer NOT NULL DEFAULT 0,
        "rematchVotes" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_matches_id" PRIMARY KEY ("id")
      )
    `);

    await runner.query(`
      CREATE TABLE "game_moves" (
        "id" uuid NOT NULL,
        "matchId" uuid NOT NULL,
        "playerId" uuid NOT NULL,
        "x" integer NOT NULL,
        "y" integer NOT NULL,
        "isHit" boolean NOT NULL,
        "sequence" integer NOT NULL,
        "clientMoveId" character varying(80) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_moves_id" PRIMARY KEY ("id")
      )
    `);

    await runner.query(
      'CREATE INDEX "IDX_game_rooms_code" ON "game_rooms" ("code")',
    );
    await runner.query(
      'CREATE INDEX "IDX_game_rooms_status_visibility" ON "game_rooms" ("status", "visibility")',
    );
    await runner.query(
      'CREATE INDEX "IDX_game_matches_room_status" ON "game_matches" ("roomId", "status")',
    );
    await runner.query(
      'CREATE INDEX "IDX_game_moves_match_sequence" ON "game_moves" ("matchId", "sequence")',
    );
    await runner.query(
      'CREATE UNIQUE INDEX "UQ_game_moves_match_client_id" ON "game_moves" ("matchId", "clientMoveId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query('DROP INDEX "public"."UQ_game_moves_match_client_id"');
    await runner.query('DROP INDEX "public"."IDX_game_moves_match_sequence"');
    await runner.query('DROP INDEX "public"."IDX_game_matches_room_status"');
    await runner.query(
      'DROP INDEX "public"."IDX_game_rooms_status_visibility"',
    );
    await runner.query('DROP INDEX "public"."IDX_game_rooms_code"');
    await runner.query('DROP TABLE "game_moves"');
    await runner.query('DROP TABLE "game_matches"');
    await runner.query('DROP TABLE "game_rooms"');
  }
}
