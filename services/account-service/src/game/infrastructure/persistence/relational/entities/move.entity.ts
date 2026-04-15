import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('game_moves')
@Index('IDX_game_moves_match_sequence', ['matchId', 'sequence'])
@Index('UQ_game_moves_match_client_id', ['matchId', 'clientMoveId'], {
  unique: true,
})
export class MoveEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  matchId: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'integer' })
  x: number;

  @Column({ type: 'integer' })
  y: number;

  @Column({ type: 'boolean' })
  isHit: boolean;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'character varying', length: 80 })
  clientMoveId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
