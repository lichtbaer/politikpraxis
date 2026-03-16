import { apiFetch } from './api';

interface TokenResponse {
  access_token: string;
  token_type: string;
  username: string;
}

interface UserResponse {
  id: string;
  email: string;
  username: string;
}

export async function register(email: string, username: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    body: { email, username, password },
  });
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getMe(token: string): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/me', { token });
}
