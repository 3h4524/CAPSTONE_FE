import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { SettingsPanel } from "@/components/admin/content-safety/settings/settings-panel";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { ModerationSettings } from "@/types/admin-moderation";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const resolveApiUrl = (path: string): string => new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const settings = (overrides: Partial<ModerationSettings> = {}): ModerationSettings => ({
  storageReady: true,
  configEnabled: true,
  geminiConfigured: true,
  enabled: true,
  thresholds: [
    { category: "sexual", blockAt: "high", locked: false },
    { category: "sexual_minors", blockAt: "any", locked: true },
    { category: "hate", blockAt: "high", locked: false },
  ],
  model: "gemini-3.5-flash-lite",
  policyVersion: 1,
  updatedAt: null,
  updatedByEmail: null,
  ...overrides,
});

describe("SettingsPanel", () => {
  it("locks the minors threshold and saves a category set to block medium too", async () => {
    let saved: unknown = null;
    server.use(
      http.get(resolveApiUrl("/api/admin/moderation/settings"), () => HttpResponse.json(settings())),
      http.put(resolveApiUrl("/api/admin/moderation/settings"), async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json(settings());
      })
    );
    renderWithQuery(<SettingsPanel />);

    expect(await screen.findByText("Blocks at any rating")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save settings" });
    expect(save).toBeDisabled();

    const sexual = screen.getByRole("radiogroup", { name: "Sexual threshold" });
    await userEvent.click(within(sexual).getByRole("radio", { name: "Block medium too" }));
    await userEvent.click(save);

    await expect.poll(() => saved).toEqual({ enabled: true, blockAt: { sexual: "medium", hate: "high" } });
  });

  it("asks before switching Gemini off", async () => {
    server.use(http.get(resolveApiUrl("/api/admin/moderation/settings"), () => HttpResponse.json(settings())));
    renderWithQuery(<SettingsPanel />);

    await userEvent.click(await screen.findByRole("switch"));

    expect(screen.getByRole("dialog", { name: "Check with the blocklist only?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep Gemini on" }));
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("explains why nothing can be changed while the tables are missing", async () => {
    server.use(
      http.get(resolveApiUrl("/api/admin/moderation/settings"), () => HttpResponse.json(settings({ storageReady: false })))
    );
    renderWithQuery(<SettingsPanel />);

    expect(await screen.findByText("The moderation tables are not in this database yet.")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
