import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('forum_comments')
@Index('IDX_forum_comments_post_createdAt', ['postId', 'createdAt'])
@Index('IDX_forum_comments_author_createdAt', ['authorId', 'createdAt'])
export class ForumCommentEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  postId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'integer', default: 0 })
  voteScore: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
