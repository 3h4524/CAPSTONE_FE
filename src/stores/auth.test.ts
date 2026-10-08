import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/stores/auth";
import { buildAuthenticatedUser } from "@/test/factories";

const initialState = useAuthStore.getState();

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState(initialState, true);
  });

  it("starts signed out and not hydrated", () => {
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isHydrated).toBe(false);
  });

  it("setUser stores the user with a null avatarUrl", () => {
    const user = buildAuthenticatedUser();

    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().user).toEqual({ ...user, avatarUrl: null });
  });

  it("setAvatarUrl updates the signed-in user", () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    useAuthStore.getState().setAvatarUrl("https://cdn.apcs.test/avatar.png");

    expect(useAuthStore.getState().user?.avatarUrl).toBe("https://cdn.apcs.test/avatar.png");
  });

  it("setAvatarUrl is a no-op while signed out", () => {
    useAuthStore.getState().setAvatarUrl("https://cdn.apcs.test/avatar.png");

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("clearSession drops the user but keeps hydration state", () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    useAuthStore.getState().markHydrated();

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  it("markHydrated flips isHydrated", () => {
    useAuthStore.getState().markHydrated();

    expect(useAuthStore.getState().isHydrated).toBe(true);
  });
});