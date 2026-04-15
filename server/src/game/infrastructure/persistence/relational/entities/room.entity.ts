import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_rooms')
@Index('IDX_game_rooms_code', ['code'])
@Index('IDX_game_rooms_status_visibility', ['status', 'visibility'])
export class RoomEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'character varying', length: 8, unique: true })
  code: string;

  @Column({ type: 'character varying', length: 20, default: 'waiting' })
  status: 'waiting' | 'setup' | 'in_game' | 'finished' | 'closed';

  @Column({ type: 'character varying', length: 10, default: 'public' })
  visibility: 'public' | 'private';

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'uuid', nullable: true })
  guestId: string | null;

  @Column({ type: 'uuid', nullable: true })
  currentMatchId: string | null;

  @Column({ type: 'boolean', default: false })
  ownerReady: boolean;

  @Column({ type: 'boolean', default: false })
  guestReady: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'character varying', length: 80, nullable: true })
  closeReasonCode: string | null;

  @Column({ type: 'character varying', length: 500, nullable: true })
  closeReasonMessage: string | null;

  @Column({ type: 'uuid', nullable: true })
  closeReasonTargetUserId: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
