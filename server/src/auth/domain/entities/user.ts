import { randomUUID } from 'node:crypto';

export interface CreateUserParams {
  email: string;
  username: string;
  passwordHash: string;
  avatar?: string | null;
  signature?: string | null;
}

export class User {
  public readonly id: string;
  public email: string;
  public username: string;
  public passwordHash: string;
  public avatar: string | null;
  public signature: string | null;
  public refreshTokenHash: string | null;
  public refreshTokenAbsoluteExpiry: number | null;

  constructor(params: CreateUserParams, id?: string) {
    this.id = id ?? randomUUID();
    this.email = params.email.trim();
    this.username = params.username.trim();
    this.passwordHash = params.passwordHash;
    this.avatar = params.avatar ?? null;
    this.signature = params.signature ?? null;
    this.refreshTokenHash = null;
    this.refreshTokenAbsoluteExpiry = null;
  }

  updateUsername(newUsername: string): void {
    const trimmed = newUsername.trim();
    this.username = trimmed;
  }

  updateSignature(newSignature: string | null): void {
    const trimmed = newSignature?.trim() ?? null;
    this.signature = trimmed && trimmed.length > 0 ? trimmed : null;
  }

  updateAvatar(avatarUrl: string | null): void {
    this.avatar = avatarUrl;
  }

  updatePasswordHash(newHash: string): void {
    this.passwordHash = newHash;
  }

  setRefreshToken(hash: string, absoluteExpiry: number): void {
    this.refreshTokenHash = hash;
    this.refreshTokenAbsoluteExpiry = absoluteExpiry;
  }

  clearRefreshToken(): void {
    this.refreshTokenHash = null;
    this.refreshTokenAbsoluteExpiry = null;
  }

  toPlainObject() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      avatar: this.avatar,
      signature: this.signature,
    };
  }
}
