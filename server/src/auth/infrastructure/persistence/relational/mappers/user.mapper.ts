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
      },
      entity.id,
    );

    domainUser.refreshTokenHash = entity.refreshTokenHash;
    domainUser.refreshTokenAbsoluteExpiry = entity.refreshTokenAbsoluteExpiry;

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
    entity.refreshTokenHash = domainUser.refreshTokenHash;
    entity.refreshTokenAbsoluteExpiry = domainUser.refreshTokenAbsoluteExpiry;

    return entity;
  }
}
