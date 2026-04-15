import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('forum_posts')
@Index('IDX_forum_posts_status_createdAt', ['status', 'createdAt'])
@Index('IDX_forum_posts_status_voteScore_createdAt', [
  'status',
  'voteScore',
  'createdAt',
])
@Check('CHK_forum_posts_status', `"status" IN ('published', 'archived')`)
export class ForumPostEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'integer', default: 0 })
  voteScore: number;

  @Column({ type: 'integer', default: 0 })
  commentCount: number;

  @Column({ type: 'varchar', length: 20, default: 'published' })
  status: 'published' | 'archived';

  @Column({ type: 'uuid', nullable: true })
  archivedByAdminId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
