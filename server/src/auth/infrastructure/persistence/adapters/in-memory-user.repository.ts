import { Injectable } from '@nestjs/common';
import { User } from '../../../domain/entities/user';
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

  findByEmail(email: string): Promise<User | null> {
    const emailLowercase = email.toLowerCase();
    const userId = this.emailIndex.get(emailLowercase);
    return Promise.resolve(userId ? (this.users.get(userId) ?? null) : null);
  }

  findByUsername(username: string): Promise<User | null> {
    const userId = this.usernameIndex.get(username);
    return Promise.resolve(userId ? (this.users.get(userId) ?? null) : null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  save(user: User): Promise<User> {
    this.removeKeysByUserId(this.emailIndex, user.id);
    this.removeKeysByUserId(this.usernameIndex, user.id);

    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
    this.usernameIndex.set(user.username, user.id);

    return Promise.resolve(user);
  }
}
