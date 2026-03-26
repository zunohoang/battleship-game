import { MigrationInterface, QueryRunner } from 'typeorm';

interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

function getSqlRunner(queryRunner: QueryRunner): SqlRunner {
  return queryRunner as unknown as SqlRunner;
}

export class InitForumTables1773446400006 implements MigrationInterface {
  name = 'InitForumTables1773446400006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(`
      CREATE TABLE "forum_posts" (
        "id" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "title" character varying(150) NOT NULL,
        "content" text NOT NULL,
        "voteScore" integer NOT NULL DEFAULT 0,
        "commentCount" integer NOT NULL DEFAULT 0,
        "status" character varying(20) NOT NULL DEFAULT 'published',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_forum_posts_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_forum_posts_status" CHECK ("status" IN ('published', 'archived')),
        CONSTRAINT "FK_forum_posts_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await runner.query(`
      CREATE TABLE "forum_comments" (
        "id" uuid NOT NULL,
        "postId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "content" text NOT NULL,
        "voteScore" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_forum_comments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_forum_comments_post" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_forum_comments_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await runner.query(`
      CREATE TABLE "forum_post_votes" (
        "postId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "value" smallint NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_forum_post_votes" PRIMARY KEY ("postId", "userId"),
        CONSTRAINT "CHK_forum_post_votes_value" CHECK ("value" IN (-1, 1)),
        CONSTRAINT "FK_forum_post_votes_post" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_forum_post_votes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await runner.query(`
      CREATE TABLE "forum_comment_votes" (
        "commentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "value" smallint NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_forum_comment_votes" PRIMARY KEY ("commentId", "userId"),
        CONSTRAINT "CHK_forum_comment_votes_value" CHECK ("value" IN (-1, 1)),
        CONSTRAINT "FK_forum_comment_votes_comment" FOREIGN KEY ("commentId") REFERENCES "forum_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_forum_comment_votes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await runner.query(
      'CREATE INDEX "IDX_forum_posts_status_createdAt" ON "forum_posts" ("status", "createdAt")',
    );
    await runner.query(
      'CREATE INDEX "IDX_forum_posts_status_voteScore_createdAt" ON "forum_posts" ("status", "voteScore", "createdAt")',
    );
    await runner.query(
      'CREATE INDEX "IDX_forum_comments_post_createdAt" ON "forum_comments" ("postId", "createdAt")',
    );
    await runner.query(
      'CREATE INDEX "IDX_forum_comments_author_createdAt" ON "forum_comments" ("authorId", "createdAt")',
    );
    await runner.query(
      'CREATE INDEX "IDX_forum_post_votes_user_post" ON "forum_post_votes" ("userId", "postId")',
    );
    await runner.query(
      'CREATE INDEX "IDX_forum_comment_votes_user_comment" ON "forum_comment_votes" ("userId", "commentId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const runner = getSqlRunner(queryRunner);

    await runner.query(
      'DROP INDEX "public"."IDX_forum_comment_votes_user_comment"',
    );
    await runner.query(
      'DROP INDEX "public"."IDX_forum_post_votes_user_post"',
    );
    await runner.query(
      'DROP INDEX "public"."IDX_forum_comments_author_createdAt"',
    );
    await runner.query(
      'DROP INDEX "public"."IDX_forum_comments_post_createdAt"',
    );
    await runner.query(
      'DROP INDEX "public"."IDX_forum_posts_status_voteScore_createdAt"',
    );
    await runner.query('DROP INDEX "public"."IDX_forum_posts_status_createdAt"');
    await runner.query('DROP TABLE "forum_comment_votes"');
    await runner.query('DROP TABLE "forum_post_votes"');
    await runner.query('DROP TABLE "forum_comments"');
    await runner.query('DROP TABLE "forum_posts"');
  }
}
