import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanAiReviewSection } from "@/components/admin/subscription-plans/plan-ai-review-section";
import type { PlanAiAssessment, PlanAiReviewResponse } from "@/types/plan-ai-review";
import type { PlanInsights } from "@/types/plan-insights";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mutate = vi.fn();
let review: PlanAiReviewResponse;

vi.mock("@/hooks/queries/use-plan-ai-review", () => ({
  usePlanAiReview: () => ({ data: review, isLoading: false }),
}));
vi.mock("@/hooks/mutations/use-regenerate-plan-ai-review", () => ({
  useRegeneratePlanAiReview: () => ({ mutate, isPending: false }),
}));

const starter = (overrides: Partial<PlanAiAssessment> = {}): PlanAiAssessment => ({
  plan: "starter",
  status: "watch",
  score: 64,
  scoreReason: "Retention is 65.3%.",
  scoreMetrics: ["retention_rate_pct"],
  summary: "Starter grew to 113 subscribers.",
  summaryMetrics: ["customers_end"],
  outlook: { direction: "stable", reason: "New customers balance those who left.", metrics: ["customers_new"] },
  strengths: [],
  risks: [],
  featureInsights: [
    {
      feature: "standard_videos",
      kinds: ["keeps_customers"],
      text: "67.2% of those who stayed used it, 34.3% of those who left.",
      suggestion: "Show video creation on the dashboard.",
      metrics: ["standard_videos.used_by_stayed_pct", "standard_videos.used_by_churned_pct"],
    },
  ],
  churnReasons: [
    {
      pattern: "Leaving is linked to making no designs or mockups.",
      evidence: "51.4% of those who left made neither.",
      confidence: "medium",
      metrics: ["never_started.left_pct"],
      hypothesis: "This may mean they never got started.",
      howToConfirm: "Check when those who left last signed in.",
    },
  ],
  churnNote: null,
  actions: [
    { text: "Review the plan's limits.", priority: "medium", kind: "investigate", metrics: ["retention_rate_pct"] },
    { text: "Add a setup checklist.", priority: "high", kind: "change", metrics: ["never_started.left_pct"] },
  ],
  ...overrides,
});

const buildReview = (overrides: Partial<PlanAiReviewResponse> = {}): PlanAiReviewResponse => ({
  isConfigured: true,
  isGenerating: false,
  latest: {
    id: "review-1",
    generatedAt: "2026-10-29T05:01:18Z",
    periodStart: "2026-08-01",
    periodEnd: "2026-10-29",
    model: "gemini-3.8-flash",
    plans: [{ key: "starter", name: "Starter", features: [{ key: "standard_videos", name: "Standard videos" }] }],
    review: { plans: [starter()], overall: "Trial conversion is 28.6%.", overallMetrics: [] },
    mrrBridges: [
      { planName: null, start: 142_286_354, new: 61_187_855, movedIn: 0, expansion: 1_000_000, contraction: 0, movedOut: 0, churn: 38_484_250, end: 165_989_959 },
      { planName: "Starter", start: 24_810_375, new: 11_947_688, movedIn: 0, expansion: 0, contraction: 0, movedOut: 499_500, churn: 8_741_250, end: 27_517_313 },
    ],
  },
  previousScores: [{ plan: "starter", status: "healthy", score: 78 }],
  nextRefreshAt: "2026-11-12T05:01:18Z",
  lastFailedAt: null,
  regenerateAvailableAt: null,
  ...overrides,
});

// Every plan together opens first; a plan's own review is one click on its tile.
const openStarter = () => fireEvent.click(screen.getByRole("tab", { name: /Starter/ }));

describe("PlanAiReviewSection", () => {
  beforeEach(() => {
    mutate.mockReset();
    review = buildReview();
  });

  it("opens on every plan together, with the overall reading and the plans side by side", () => {
    render(<PlanAiReviewSection />);

    expect(screen.getByRole("tab", { name: /All plans/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Across all plans").nextElementSibling).toHaveTextContent("Trial conversion is 28.6%.");
    expect(screen.getByRole("row", { name: /Starter.*64 · Watch.*Stable.*Healthy · 78/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Starter" }));
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Starter grew to 113 subscribers.")).toBeInTheDocument();
  });

  it("shows each plan's verdict, its change since the last review and where the review came from", () => {
    render(<PlanAiReviewSection />);
    openStarter();

    expect(screen.getByText("Starter")).toBeInTheDocument();
    // The score change is its own chip, apart from the status and the outlook.
    expect(screen.getByText("▼ 14")).toBeInTheDocument();
    expect(screen.getByText("Last review: Healthy · 78")).toBeInTheDocument();
    expect(screen.getByText(/AI review of 1 Aug – 29 Oct 2026 · Generated 29 Oct 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Features/ }));
    expect(screen.getByText("Standard videos")).toBeInTheDocument();
    expect(screen.getByText("Keeps customers")).toBeInTheDocument();
  });

  it("shows a score change only from 5 points, since the model's score drifts a little between runs", () => {
    review = buildReview({ previousScores: [{ plan: "starter", status: "watch", score: 60 }] });
    render(<PlanAiReviewSection />);

    expect(screen.getByText("Last review: Watch · 60")).toBeInTheDocument();
    expect(screen.queryByText("▲ 4")).not.toBeInTheDocument();
  });

  it("shows the MRR bridge from the review's own figures, for all plans and the picked plan", () => {
    render(<PlanAiReviewSection />);

    const all = screen.getByLabelText("MRR bridge");
    expect(all).toHaveTextContent("MRR 31 Jul 2026");
    expect(all).toHaveTextContent("Plan changes");
    expect(all).not.toHaveTextContent("Expansion");

    openStarter();
    const plan = screen.getByLabelText("MRR bridge");
    expect(plan).toHaveTextContent("Moved out");
    expect(plan).toHaveTextContent("MRR 29 Oct 2026");
  });

  it("keeps a churn pattern apart from its unconfirmed explanation", () => {
    render(<PlanAiReviewSection />);
    openStarter();
    fireEvent.click(screen.getByRole("button", { name: /^Why customers leave/ }));

    expect(screen.getByText("Leaving is linked to making no designs or mockups.")).toBeInTheDocument();
    expect(screen.getByText("Possible explanation, unconfirmed:")).toBeInTheDocument();
    expect(screen.getByText("To confirm:")).toBeInTheDocument();
  });

  it("lists high priority actions first, with their kind", () => {
    render(<PlanAiReviewSection />);
    openStarter();

    const actions = screen.getAllByText(/^(Change|Investigate)$/).map((label) => label.textContent);
    expect(actions).toEqual(["Change", "Investigate"]);
  });

  it("shows the backend's note when churn was not analysed", () => {
    const note = "Churn patterns were not analysed: 7 customers stopped paying and 24 stayed in this period, and each group needs at least 10 to compare them reliably.";
    review = buildReview();
    review.latest!.review.plans = [starter({ churnReasons: [], churnNote: note })];

    render(<PlanAiReviewSection />);
    openStarter();
    fireEvent.click(screen.getByRole("button", { name: /^Why customers leave/ }));

    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it("turns Regenerate off during the cooldown and says until when", () => {
    review = buildReview({ regenerateAvailableAt: "2999-01-01T05:00:00Z" });

    render(<PlanAiReviewSection />);

    expect(screen.getByRole("button", { name: /Regenerate/ })).toBeDisabled();
    expect(screen.getByText("Available again on 1 Jan 2999 at 05:00 UTC.")).toBeInTheDocument();
  });

  it("says a review is being written and that the page will update", () => {
    review = buildReview({ isGenerating: true });

    render(<PlanAiReviewSection />);

    expect(screen.getByRole("button", { name: /Generating/ })).toBeDisabled();
    expect(screen.getByText(/Writing a new review/)).toBeInTheDocument();
  });

  it("opens the picked plan's detail, with who stayed and left and the rule-based check", () => {
    review = buildReview();
    review.latest!.plans.push({ key: "pro", name: "Pro", features: [] });
    review.latest!.review.plans.push(
      starter({ plan: "pro", status: "healthy", score: 80, summary: "Pro kept most customers.", churnReasons: [], churnNote: "Not analysed." })
    );
    const insights = {
      days: 90,
      plans: [
        { key: "starter", isTrial: false, subscribers: 113 },
        { key: "pro", isTrial: false, subscribers: 77 },
        { key: "trial", isTrial: true, subscribers: 12 },
      ],
      verdicts: [{ key: "pro", verdictLabel: "Healthy", evidence: ["Keeps 72.7% of its customers."], action: null }],
      churnSignals: [
        {
          key: "pro",
          stayed: 56,
          left: 21,
          minimumGroup: 10,
          hasEnoughData: true,
          features: [
            { metric: "ai_videos", label: "AI videos", includedInPlan: true, stayedRate: 66.1, leftRate: 23.8 },
            { metric: "exports", label: "ZIP exports", includedInPlan: true, stayedRate: 76.8, leftRate: 42.9 },
          ],
          leftWithoutCoreUseRate: 38.1,
          coreFeatures: ["Rendered mockups", "Design images"],
          leaveGroups: [
            { key: "never_started", label: "Never got started", left: 8, leftRate: 38.1, stayed: 3, stayedRate: 5.4, notable: true },
            { key: "steady", label: "Used it steadily", left: 13, leftRate: 61.9, stayed: 53, stayedRate: 94.6, notable: false },
          ],
        },
      ],
    } as unknown as PlanInsights;

    render(<PlanAiReviewSection insights={insights} />);
    // Paying subscribers and running trials sit on the All plans tile.
    expect(screen.getByRole("tab", { name: /All plans/ })).toHaveTextContent("190 paying · 12 on trial");
    openStarter();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Starter grew to 113 subscribers.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Pro/ }));

    expect(screen.getByText("Pro kept most customers.")).toBeInTheDocument();
    expect(screen.getByText(/Rule-based check \(Healthy\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Features/ }));
    expect(screen.getByText(/56 customers stayed and 21 stopped paying in the last 90 days/)).toBeInTheDocument();
    // The widest gap first.
    expect(screen.getAllByText(/^(AI videos|ZIP exports)$/).map((item) => item.textContent)).toEqual(["AI videos", "ZIP exports"]);
    fireEvent.click(screen.getByRole("button", { name: /^Why customers leave/ }));
    // Each customer who left in one group, the notable one marked.
    const groups = screen.getByLabelText("Leave groups");
    const started = within(groups).getByRole("row", { name: /Never got started/ });
    expect(within(started).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(
      expect.arrayContaining(["38.1%8 of 21", "5.4%"])
    );
    expect(within(started).getByRole("img", { name: "Left 38.1%, Stayed 5.4%" })).toBeInTheDocument();
    expect(groups).toHaveTextContent("Never used rendered mockups or design images, the plan's most used features.");
    expect(screen.getByText("Notable")).toBeInTheDocument();
  });

  it("before the first review, points to Regenerate and the rule-based verdicts", () => {
    review = buildReview({ latest: null, previousScores: [], nextRefreshAt: null });

    render(<PlanAiReviewSection />);

    expect(screen.getByText(/No AI review yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/ })).toBeEnabled();
  });
});
