// Auth domain types
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
