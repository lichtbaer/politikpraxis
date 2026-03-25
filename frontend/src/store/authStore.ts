import { create } from 'zustand';
import {
  deleteAccountApi,
  getMe,
  logoutApi,
  refreshAccessToken,
  type UserResponse,
} from '../services/auth';
import { setTokenRefresher } from '../services/api';

export interface AuthSession {
  userId: string;
  email: string;
  accessToken: string;
}

interface AuthStore {
  userId: string | null;
  email: string | null;
  isLoggedIn: boolean;
  /** Nur im Arbeitsspeicher — kein localStorage */
  accessToken: string | null;

  setSession: (session: AuthSession) => void;
  clear: () => void;
  applyUser: (user: UserResponse, accessToken: string) => void;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  userId: null,
  email: null,
  isLoggedIn: false,
  accessToken: null,

  setSession: (session) =>
    set({
      userId: session.userId,
      email: session.email,
      accessToken: session.accessToken,
      isLoggedIn: true,
    }),

  applyUser: (user, accessToken) =>
    set({
      userId: user.id,
      email: user.email,
      accessToken,
      isLoggedIn: true,
    }),

  clear: () =>
    set({
      userId: null,
      email: null,
      accessToken: null,
      isLoggedIn: false,
    }),

  bootstrap: async () => {
    try {
      const { access_token } = await refreshAccessToken();
      const me = await getMe(access_token);
      set({
        accessToken: access_token,
        userId: me.id,
        email: me.email,
        isLoggedIn: true,
      });
    } catch {
      get().clear();
    }
  },

  logout: async () => {
    try {
      await logoutApi();
    } finally {
      get().clear();
    }
  },

  deleteAccount: async () => {
    const token = get().accessToken;
    if (!token) return;
    await deleteAccountApi(token);
    get().clear();
  },
}));

// Wire up auto-refresh: when apiFetch gets a 401, it calls this to get a fresh token
setTokenRefresher(async () => {
  try {
    const { access_token } = await refreshAccessToken();
    useAuthStore.setState({ accessToken: access_token });
    return access_token;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
});
