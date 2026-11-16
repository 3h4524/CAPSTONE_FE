import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { SystemApiKeysShell } from "@/components/admin/system-api-keys/system-api-keys-shell";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { AdminSystemApiKey, AdminSystemApiKeys } from "@/types/admin-system-api-keys";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const key = (overrides: Partial<AdminSystemApiKey> = {}): AdminSystemApiKey => ({
  id: "key-1",
  provider: "ideogram",
  label: "Team account",
  maskedKey: "****9876",
  keyId: "abcdef123456",
  isActive: true,
  usedToday: 42,
  refusedToday: null,
  readable: true,
  lastCheckedAt: null,
  lastCheckSucceeded: true,
  createdAt: "2026-11-16T05:00:00Z",
  updatedAt: "2026-11-16T05:00:00.123456Z",
  ...overrides,
});

const page = (ideogramKeys: AdminSystemApiKey[] = [key()]): AdminSystemApiKeys => ({
  providers: [
    {
      provider: "ideogram",
      name: "Ideogram",
      dailyLimitPerKey: 500,
      maxConcurrentPerKey: 8,
      strategy: "fill",
      updatedAt: "2026-11-16T04:00:00Z",
      keys: ideogramKeys,
    },
    { provider: "minimax", name: "MiniMax", dailyLimitPerKey: 100, maxConcurrentPerKey: null, strategy: "fill", updatedAt: "2026-11-16T04:00:00Z", keys: [] },
  ],
  storageReady: true,
});

describe("SystemApiKeysShell", () => {
  it("says the key tables are missing when the migration has not reached the database", async () => {
    server.use(http.get(resolveApiUrl("/api/admin/system-api-keys"), () => HttpResponse.json({ providers: [], storageReady: false })));
    renderWithQuery(<SystemApiKeysShell />);

    expect(await screen.findByText("This database has no key tables yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add key" })).toBeDisabled();
  });

  it("shows each key masked with today's use, and says what a provider without keys falls back to", async () => {
    server.use(
      http.get(resolveApiUrl("/api/admin/system-api-keys"), () =>
        HttpResponse.json(page([key(), key({ id: "key-2", label: "Spare account", refusedToday: "Ideogram returned 402: out of credits" })]))
      )
    );
    renderWithQuery(<SystemApiKeysShell />);

    const ideogram = await screen.findByRole("region", { name: "Ideogram" });
    expect(within(ideogram).getAllByText("****9876")).toHaveLength(2);
    expect(within(ideogram).getByRole("meter", { name: "Team account used today" })).toHaveAttribute("aria-valuenow", "42");
    expect(within(ideogram).getByText("Refused today")).toBeInTheDocument();
    expect(within(ideogram).getByRole("button", { name: "Use Spare account again today" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "MiniMax" })).getByText(/No MiniMax keys yet/)).toBeInTheDocument();
  });

  it("adds a key with the provider, name and key typed, and shows the page the server answers with", async () => {
    let sent: unknown = null;
    server.use(
      http.get(resolveApiUrl("/api/admin/system-api-keys"), () => HttpResponse.json(page([]))),
      http.post(resolveApiUrl("/api/admin/system-api-keys/keys"), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(page([key({ label: "New account" })]));
      })
    );
    renderWithQuery(<SystemApiKeysShell />);
    await screen.findByRole("region", { name: "Ideogram" });

    await userEvent.click(screen.getByRole("button", { name: "Add key" }));
    await userEvent.click(screen.getByLabelText("Name"));
    await userEvent.paste("New account");
    // A key is pasted, not typed.
    await userEvent.click(screen.getByLabelText("API key"));
    await userEvent.paste("ideogram-secret-key-9876");
    await userEvent.click(screen.getByRole("button", { name: "Check and add" }));

    await expect.poll(() => sent).toEqual({ provider: "ideogram", label: "New account", key: "ideogram-secret-key-9876" });
    expect(await screen.findByText("New account")).toBeInTheDocument();
  });

  it("asks for the whole key before sending anything", async () => {
    let posted = false;
    server.use(
      http.get(resolveApiUrl("/api/admin/system-api-keys"), () => HttpResponse.json(page([]))),
      http.post(resolveApiUrl("/api/admin/system-api-keys/keys"), () => {
        posted = true;
        return HttpResponse.json(page([]));
      })
    );
    renderWithQuery(<SystemApiKeysShell />);
    await screen.findByRole("region", { name: "Ideogram" });

    await userEvent.click(screen.getByRole("button", { name: "Add key" }));
    await userEvent.click(screen.getByLabelText("Name"));
    await userEvent.paste("Short");
    await userEvent.click(screen.getByLabelText("API key"));
    await userEvent.paste("abc");
    await userEvent.click(screen.getByRole("button", { name: "Check and add" }));

    expect(await screen.findByText("Paste the whole key.")).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it("saves a provider's limits with the time it read them, an empty box meaning no limit", async () => {
    let saved: unknown = null;
    server.use(
      http.get(resolveApiUrl("/api/admin/system-api-keys"), () => HttpResponse.json(page())),
      http.put(resolveApiUrl("/api/admin/system-api-keys/providers/ideogram"), async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json(page());
      })
    );
    renderWithQuery(<SystemApiKeysShell />);
    const limits = await screen.findByRole("form", { name: "Ideogram limits" });

    expect(within(limits).getByRole("button", { name: "Save limits" })).toBeDisabled();
    await userEvent.clear(within(limits).getByLabelText("Requests per key per day"));
    await userEvent.click(within(limits).getByRole("button", { name: "Save limits" }));

    await expect.poll(() => saved).toEqual({
      dailyLimitPerKey: null,
      maxConcurrentPerKey: 8,
      strategy: "fill",
      updatedAt: "2026-11-16T04:00:00Z",
    });
  });

  it("switches a key off with the time it was read, and deletes one only after asking", async () => {
    let switched: unknown = null;
    let deleted = false;
    server.use(
      http.get(resolveApiUrl("/api/admin/system-api-keys"), () => HttpResponse.json(page())),
      http.put(resolveApiUrl("/api/admin/system-api-keys/keys/key-1"), async ({ request }) => {
        switched = await request.json();
        return HttpResponse.json(page([key({ isActive: false })]));
      }),
      http.delete(resolveApiUrl("/api/admin/system-api-keys/keys/key-1"), () => {
        deleted = true;
        return HttpResponse.json(page([]));
      })
    );
    renderWithQuery(<SystemApiKeysShell />);

    await userEvent.click(await screen.findByRole("switch", { name: "Switch off Team account" }));
    await expect.poll(() => switched).toEqual({ label: "Team account", isActive: false, updatedAt: "2026-11-16T05:00:00.123456Z" });

    await userEvent.click(screen.getByRole("button", { name: "Delete Team account" }));
    expect(deleted).toBe(false);
    const dialog = await screen.findByRole("dialog", { name: "Delete Team account?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete key" }));

    await expect.poll(() => deleted).toBe(true);
  });
});
