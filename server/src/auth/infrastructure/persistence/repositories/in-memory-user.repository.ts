import { Injectable } from '@nestjs/common';
import { User as DomainUser } from '../../../domain/entities/user';
import { User } from '../entities/user';
import { UserMapper } from '../mappers/user.mapper';
import type { IUserRepository } from '../user.repository';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();
  private emailIndex = new Map<string, string>();
  private usernameIndex = new Map<string, string>();

  private removeKeysByUserId(index: Map<string, string>, userId: string): void {
    for (const [key, value] of index.entries()) {
      if (value === userId) {
        index.delete(key);
      }
    }
  }

  private findDomainById(userId: string | undefined): DomainUser | null {
    if (!userId) {
      return null;
    }

    const persistenceUser = this.users.get(userId);
    return persistenceUser ? UserMapper.toDomain(persistenceUser) : null;
  }

  findByEmail(email: string): Promise<DomainUser | null> {
    const emailLowercase = email.toLowerCase();
    const userId = this.emailIndex.get(emailLowercase);
    return Promise.resolve(this.findDomainById(userId));
  }

  findByUsername(username: string): Promise<DomainUser | null> {
    const userId = this.usernameIndex.get(username);
    return Promise.resolve(this.findDomainById(userId));
  }

  findById(id: string): Promise<DomainUser | null> {
    return Promise.resolve(this.findDomainById(id));
  }

  save(user: DomainUser): Promise<DomainUser> {
    const persistenceUser = UserMapper.toPersistence(user);

    this.removeKeysByUserId(this.emailIndex, persistenceUser.id);
    this.removeKeysByUserId(this.usernameIndex, persistenceUser.id);

    this.users.set(persistenceUser.id, persistenceUser);
    this.emailIndex.set(
      persistenceUser.email.toLowerCase(),
      persistenceUser.id,
    );
    this.usernameIndex.set(persistenceUser.username, persistenceUser.id);

    return Promise.resolve(user);
  }
}
