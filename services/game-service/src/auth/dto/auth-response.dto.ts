export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  signature: string | null;
  elo: number;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
