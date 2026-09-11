import { create } from "zustand";

import type { Profile } from "@/types/profile";

export type ShellUser = Pick<Profile, "email" | "fullName" | "avatarUrl">;

type UserState = {
  user: ShellUser | null;
  setUser: (user: ShellUser) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
