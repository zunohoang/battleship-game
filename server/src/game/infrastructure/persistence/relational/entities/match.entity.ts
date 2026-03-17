import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  BoardConfig,
  PlacedShip,
  ShipDefinition,
  ShotRecord,
} from '../../../../types/game.types';

@Entity('game_matches')
@Index('IDX_game_matches_room_status', ['roomId', 'status'])
export class MatchEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'character varying', length: 20, default: 'setup' })
  status: 'setup' | 'in_progress' | 'finished';

  @Column({ type: 'jsonb' })
  boardConfig: BoardConfig;

  @Column({ type: 'jsonb' })
  ships: ShipDefinition[];

  @Column({ type: 'integer', default: 30 })
  turnTimerSeconds: number;

  @Column({ type: 'uuid' })
  player1Id: string;

  @Column({ type: 'uuid' })
  player2Id: string;

  @Column({ type: 'jsonb', nullable: true })
  player1Placements: PlacedShip[] | null;

  @Column({ type: 'jsonb', nullable: true })
  player2Placements: PlacedShip[] | null;

  @Column({ type: 'jsonb', default: [] })
  player1Shots: ShotRecord[];

  @Column({ type: 'jsonb', default: [] })
  player2Shots: ShotRecord[];

  @Column({ type: 'uuid', nullable: true })
  turnPlayerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  winnerId: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  setupDeadlineAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  turnDeadlineAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  rematchVotes: Record<string, boolean>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
