import { beforeEach, describe, expect, it } from "vitest";

import { useOnboardingGuideStore } from "@/stores/onboarding-guide";

const initialState = useOnboardingGuideStore.getState();

beforeEach(() => {
  useOnboardingGuideStore.setState(initialState, true);
});

describe("onboarding guide store", () => {
  it("starts with no guide and nothing dismissed", () => {
    expect(useOnboardingGuideStore.getState().activeGuide).toBeNull();
    expect(useOnboardingGuideStore.getState().resumeStep).toBe(0);
    expect(useOnboardingGuideStore.getState().dismissedThisSession).toEqual([]);
  });

  it("starts a guide at the first step by default", () => {
    useOnboardingGuideStore.getState().start("api-keys");

    expect(useOnboardingGuideStore.getState().activeGuide).toBe("api-keys");
    expect(useOnboardingGuideStore.getState().resumeStep).toBe(0);
  });

  it("starts a guide at the step it was left off at", () => {
    useOnboardingGuideStore.getState().start("workflows", 2);

    expect(useOnboardingGuideStore.getState().activeGuide).toBe("workflows");
    expect(useOnboardingGuideStore.getState().resumeStep).toBe(2);
  });

  it("clears the running guide and its step", () => {
    useOnboardingGuideStore.getState().start("mockups", 3);
    useOnboardingGuideStore.getState().stop();

    expect(useOnboardingGuideStore.getState().activeGuide).toBeNull();
    expect(useOnboardingGuideStore.getState().resumeStep).toBe(0);
  });

  it("keeps a guide dismissed for the session once", () => {
    useOnboardingGuideStore.getState().dismissThisSession("batches");
    useOnboardingGuideStore.getState().dismissThisSession("batches");

    expect(useOnboardingGuideStore.getState().dismissedThisSession).toEqual(["batches"]);
  });
});
