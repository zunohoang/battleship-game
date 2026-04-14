import { User as DomainUser } from '../../../../domain/entities/user';
import { UserEntity } from '../entities/user.entity';

export class RelationalUserMapper {
  static toDomain(entity: UserEntity): DomainUser {
    const domainUser = new DomainUser(
      {
        email: entity.email,
        username: entity.username,
        passwordHash: entity.passwordHash,
        avatar: entity.avatar,
        signature: entity.signature,
        elo: entity.elo ?? undefined,
        role: entity.role ?? 'USER',
      },
      entity.id,
    );

    domainUser.refreshTokenHash = entity.refreshTokenHash;
    domainUser.refreshTokenAbsoluteExpiry = entity.refreshTokenAbsoluteExpiry;
    domainUser.bannedUntil = entity.bannedUntil;
    domainUser.bannedPermanent = entity.bannedPermanent ?? false;
    domainUser.banReason = entity.banReason;
    domainUser.bannedAt = entity.bannedAt;

    return domainUser;
  }

  static toEntity(domainUser: DomainUser): UserEntity {
    const entity = new UserEntity();
    entity.id = domainUser.id;
    entity.email = domainUser.email.toLowerCase();
    entity.username = domainUser.username;
    entity.passwordHash = domainUser.passwordHash;
    entity.avatar = domainUser.avatar;
    entity.signature = domainUser.signature;
    entity.elo = domainUser.elo;
    entity.role = domainUser.role;
    entity.bannedUntil = domainUser.bannedUntil;
    entity.bannedPermanent = domainUser.bannedPermanent;
    entity.banReason = domainUser.banReason;
    entity.bannedAt = domainUser.bannedAt;
    entity.refreshTokenHash = domainUser.refreshTokenHash;
    entity.refreshTokenAbsoluteExpiry = domainUser.refreshTokenAbsoluteExpiry;

    return entity;
  }
}
