export interface IPasswordHasherRepository {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER_REPOSITORY = Symbol('PASSWORD_HASHER_REPOSITORY');
