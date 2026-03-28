import apiClient from './axios'
import { clearAccessToken } from './authToken'

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterResponse {
  accessToken: string
  user: {
    id: string
    username: string
    email: string
    avatar: string | null
    signature: string | null
    elo: number
  }
}

export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    username: string
    email: string
    avatar: string | null
    signature: string | null
    elo: number
  }
}

export interface UpdateProfileRequest {
  username: string
  signature: string
  avatarFile?: File | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileResponse {
  accessToken: string
  user: {
    id: string
    username: string
    email: string
    avatar: string | null
    signature: string | null
    elo: number
  }
}

export interface UserProfileResponse {
  id: string
  username: string
  avatar: string | null
  signature: string | null
  elo: number
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', payload)
  return response.data
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload)
  return response.data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    clearAccessToken()
  }
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UpdateProfileResponse> {
  const formData = new FormData()
  formData.append('username', payload.username)
  formData.append('signature', payload.signature)

  if (payload.avatarFile) {
    formData.append('avatar', payload.avatarFile)
  }

  const response = await apiClient.patch<UpdateProfileResponse>(
    '/users/me',
    formData,
  )

  return response.data
}

export async function changePassword(
  payload: ChangePasswordRequest,
): Promise<UpdateProfileResponse> {
  const response = await apiClient.patch<UpdateProfileResponse>(
    '/users/me/password',
    payload,
  )
  return response.data
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const response = await apiClient.get<UserProfileResponse>(`/users/${userId}/profile`)
  return response.data
}
