import type { APIRequestContext } from "@playwright/test";

import { PAGE_GUIDE_VERSIONS } from "../../src/constants/onboarding";

const ensureOk = async (label: string, response: Awaited<ReturnType<APIRequestContext["fetch"]>>) => {
  if (!response.ok()) {
    throw new Error(`${label} failed with ${response.status()}: ${await response.text()}`);
  }
};

export const setEnglishInterface = async (api: APIRequestContext) => {
  await ensureOk("Setting the profile language", await api.patch("/api/profile", { data: { language: "en" } }));
};

export const skipPageGuides = async (api: APIRequestContext) => {
  const guideProgress = Object.fromEntries(
    Object.entries(PAGE_GUIDE_VERSIONS).map(([guideKey, version]) => [
      guideKey,
      { version, status: "skipped", step: 0 },
    ])
  );

  await ensureOk(
    "Skipping the page guides",
    await api.put("/api/profile/onboarding", { data: { guideProgress, checklistDismissed: false } })
  );
};
