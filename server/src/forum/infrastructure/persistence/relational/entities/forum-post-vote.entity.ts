import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('forum_post_votes')
@Index('IDX_forum_post_votes_user_post', ['userId', 'postId'])
@Check('CHK_forum_post_votes_value', `"value" IN (-1, 1)`)
export class ForumPostVoteEntity {
  @PrimaryColumn({ type: 'uuid' })
  postId: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'smallint' })
  value: 1 | -1;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
