import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('forum_comment_votes')
@Index('IDX_forum_comment_votes_user_comment', ['userId', 'commentId'])
@Check('CHK_forum_comment_votes_value', `"value" IN (-1, 1)`)
export class ForumCommentVoteEntity {
  @PrimaryColumn({ type: 'uuid' })
  commentId: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'smallint' })
  value: 1 | -1;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
