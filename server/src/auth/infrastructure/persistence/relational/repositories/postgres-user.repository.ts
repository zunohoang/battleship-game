import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User as DomainUser } from '../../../../domain/entities/user';
import { UserEntity } from '../entities/user.entity';
import { RelationalUserMapper } from '../mappers/user.mapper';
import type { IUserRepository } from '../../user.repository';

interface PostgresDriverError {
  code?: string;
  constraint?: string;
}

interface QueryFailedLike {
  driverError?: PostgresDriverError;
}

interface UserStore {
  findOne(options: {
    where: Partial<Pick<UserEntity, 'id' | 'email' | 'username'>>;
  }): Promise<UserEntity | null>;
  count(options: {
    where: Partial<Pick<UserEntity, 'role'>>;
  }): Promise<number>;
  save(entity: UserEntity): Promise<UserEntity>;
}

function toUserStore(value: unknown): UserStore {
  return value as UserStore;
}

function getDriverError(error: unknown): PostgresDriverError | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const queryFailedLike = error as QueryFailedLike;
  return queryFailedLike.driverError;
}

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  private readonly repository: UserStore;

  constructor(
    @InjectRepository(UserEntity)
    repository: unknown,
  ) {
    this.repository = toUserStore(repository);
  }

  async findByEmail(email: string): Promise<DomainUser | null> {
    const user = await this.repository.findOne({
      where: { email: email.toLowerCase() },
    });

    return user ? RelationalUserMapper.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<DomainUser | null> {
    const user = await this.repository.findOne({
      where: { username },
    });

    return user ? RelationalUserMapper.toDomain(user) : null;
  }

  async findById(id: string): Promise<DomainUser | null> {
    const user = await this.repository.findOne({
      where: { id },
    });

    return user ? RelationalUserMapper.toDomain(user) : null;
  }

  async countByRole(role: string): Promise<number> {
    return this.repository.count({
      where: { role: role.toUpperCase() },
    });
  }

  async save(user: DomainUser): Promise<DomainUser> {
    const entity = RelationalUserMapper.toEntity(user);
    try {
      const savedEntity = await this.repository.save(entity);
      return RelationalUserMapper.toDomain(savedEntity);
    } catch (error) {
      const driverError = getDriverError(error);
      if (driverError?.code === '23505') {
        if (driverError.constraint === 'UQ_users_email') {
          throw new ConflictException({
            error: 'EMAIL_ALREADY_EXISTS',
            message: 'Email already exists',
          });
        }

        if (driverError.constraint === 'UQ_users_username') {
          throw new ConflictException({
            error: 'USERNAME_ALREADY_EXISTS',
            message: 'Username already exists',
          });
        }
      }

      throw error;
    }
  }
}
