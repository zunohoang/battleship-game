import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  signature!: string | null;

  @Column({ type: 'integer', default: 800 })
  elo!: number;

  @Column({ type: 'varchar', length: 20, default: 'USER' })
  role!: string;

  @Column({ type: 'timestamptz', nullable: true })
  bannedUntil!: Date | null;

  @Column({ type: 'boolean', default: false })
  bannedPermanent!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  banReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  bannedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  banActorId!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  lastBanAction!: 'BAN_USER_TEMP' | 'BAN_USER_PERMANENT' | null;

  @Column({ type: 'timestamptz', nullable: true })
  unbannedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  unbanActorId!: string | null;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash!: string | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  refreshTokenAbsoluteExpiry!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
