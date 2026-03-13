import { randomUUID } from 'node:crypto';

export interface PersistenceUserParams {
  email: string;
  username: string;
  passwordHash: string;
  avatar?: string | null;
  signature?: string | null;
  refreshTokenHash?: string | null;
  refreshTokenAbsoluteExpiry?: number | null;
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

  constructor(params: PersistenceUserParams, id?: string) {
    this.id = id ?? randomUUID();
    this.email = params.email.trim();
    this.username = params.username.trim();
    this.passwordHash = params.passwordHash;
    this.avatar = params.avatar ?? null;
    this.signature = params.signature ?? null;
    this.refreshTokenHash = params.refreshTokenHash ?? null;
    this.refreshTokenAbsoluteExpiry = params.refreshTokenAbsoluteExpiry ?? null;
  }
}
