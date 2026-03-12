export interface RefreshTokenPayload {
  sub: string;
  email: string;
  jti: string;
  absoluteExpiry: number;
}

export interface ITokenService {
  generate(payload: { sub: string; email: string }): Promise<string>;
  validate(token: string): Promise<{ sub: string; email: string } | null>;
  generateRefreshToken(
    userId: string,
    email: string,
    absoluteExpiry: number,
  ): Promise<{ token: string; jti: string }>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
  decodeRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
