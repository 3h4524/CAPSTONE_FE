import { vi } from "vitest";

const buildCookieStore = () => ({
  get: vi.fn((name: string) =>
    name === "accessToken" ? { name, value: "test-access-token" } : undefined
  ),
  getAll: vi.fn(() => [{ name: "accessToken", value: "test-access-token" }]),
  has: vi.fn(() => true),
  set: vi.fn(),
  delete: vi.fn(),
  toString: vi.fn(() => "accessToken=test-access-token"),
});

export const cookies = vi.fn(() => Promise.resolve(buildCookieStore()));

export const headers = vi.fn(() => Promise.resolve(new Headers()));

export const draftMode = vi.fn(() =>
  Promise.resolve({ isEnabled: false, enable: vi.fn(), disable: vi.fn() })
);