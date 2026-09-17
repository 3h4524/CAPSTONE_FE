import { create } from "zustand";

import type { AuthenticatedUser } from "@/types/auth";

export type SessionUser = AuthenticatedUser & {
  avatarUrl: string | null;
};

type AuthState = {
  // No access token here: it lives only in an HttpOnly cookie the backend sets, which client
  // JS cannot read. This store exists purely so UI can react to "who is signed in".
  user: SessionUser | null;
  // False until the app-mount silent refresh has resolved (success or failure), so UI that
  // depends on auth status can wait instead of flashing "signed out" before that check runs.
  isHydrated: boolean;
  setUser: (user: AuthenticatedUser) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => set({ user: { ...user, avatarUrl: null } }),

  setAvatarUrl: (avatarUrl) =>
    set((state) => (state.user ? { user: { ...state.user, avatarUrl } } : state)),

  clearSession: () => set({ user: null }),

  markHydrated: () => set({ isHydrated: true }),
}));
