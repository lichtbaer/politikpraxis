import { apiFetch } from './api';

export interface AccessTokenPayload {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
}

export async function requestMagicLink(email: string): Promise<void> {
  await apiFetch('/auth/magic-link', {
    method: 'POST',
    body: { email },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch('/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<AccessTokenPayload> {
  return apiFetch<AccessTokenPayload>('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, new_password: newPassword },
  });
}

export async function register(email: string, password: string): Promise<AccessTokenPayload> {
  return apiFetch<AccessTokenPayload>('/auth/register', {
    method: 'POST',
    body: { email, password },
  });
}

export async function login(email: string, password: string): Promise<AccessTokenPayload> {
  return apiFetch<AccessTokenPayload>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function refreshAccessToken(): Promise<AccessTokenPayload> {
  return apiFetch<AccessTokenPayload>('/auth/refresh', {
    method: 'POST',
  });
}

export async function logoutApi(): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'POST',
  });
}

export async function getMe(token: string): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/me', {
    token,
  });
}

export async function deleteAccountApi(token: string): Promise<void> {
  await apiFetch('/auth/account', {
    method: 'DELETE',
    token,
  });
}
