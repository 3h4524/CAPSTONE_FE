import { create } from "zustand";

import type { AuthenticatedUser } from "@/types/auth";

type AuthState = {
  // No access token here: it lives only in an HttpOnly cookie the backend sets, which client
  // JS cannot read. This store exists purely so UI can react to "who is signed in".
  user: AuthenticatedUser | null;
  // False until the app-mount silent refresh has resolved (success or failure), so UI that
  // depends on auth status can wait instead of flashing "signed out" before that check runs.
  isHydrated: boolean;
  setUser: (user: AuthenticatedUser) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => set({ user }),

  clearSession: () => set({ user: null }),

  markHydrated: () => set({ isHydrated: true }),
}));
