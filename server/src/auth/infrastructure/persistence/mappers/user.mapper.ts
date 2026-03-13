import { User as DomainUser } from '../../../domain';
import { User as PersistenceUser } from '../entities/user';

export class UserMapper {
  static toPersistence(domainUser: DomainUser): PersistenceUser {
    return new PersistenceUser(
      {
        email: domainUser.email,
        username: domainUser.username,
        passwordHash: domainUser.passwordHash,
        avatar: domainUser.avatar,
        signature: domainUser.signature,
        refreshTokenHash: domainUser.refreshTokenHash,
        refreshTokenAbsoluteExpiry: domainUser.refreshTokenAbsoluteExpiry,
      },
      domainUser.id,
    );
  }

  static toDomain(persistenceUser: PersistenceUser): DomainUser {
    const domainUser = new DomainUser(
      {
        email: persistenceUser.email,
        username: persistenceUser.username,
        passwordHash: persistenceUser.passwordHash,
        avatar: persistenceUser.avatar,
        signature: persistenceUser.signature,
      },
      persistenceUser.id,
    );

    domainUser.refreshTokenHash = persistenceUser.refreshTokenHash;
    domainUser.refreshTokenAbsoluteExpiry =
      persistenceUser.refreshTokenAbsoluteExpiry;

    return domainUser;
  }
}
