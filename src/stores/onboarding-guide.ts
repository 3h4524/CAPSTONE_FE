import { create } from "zustand";

import type { OnboardingGuideKey } from "@/types/onboarding";

type OnboardingGuideState = {
  activeGuide: OnboardingGuideKey | null;
  resumeStep: number;
  dismissedThisSession: OnboardingGuideKey[];
  start: (guide: OnboardingGuideKey, step?: number) => void;
  stop: () => void;
  dismissThisSession: (guide: OnboardingGuideKey) => void;
};

export const useOnboardingGuideStore = create<OnboardingGuideState>((set, get) => ({
  activeGuide: null,
  resumeStep: 0,
  dismissedThisSession: [],
  start: (guide, step = 0) => set({ activeGuide: guide, resumeStep: step }),
  stop: () => set({ activeGuide: null, resumeStep: 0 }),
  dismissThisSession: (guide) => {
    if (!get().dismissedThisSession.includes(guide)) {
      set({ dismissedThisSession: [...get().dismissedThisSession, guide] });
    }
  },
}));
