import assert from "node:assert/strict";
import { test } from "node:test";

import {
  adoptionDrop,
  adoptionSummary,
  formatShare,
  isUnderused,
  orderFeatures,
  splitAiLabel,
} from "@/helpers/plan-adoption";

test("a drop from the plan before is shown from 5 points, as a positive number", () => {
  assert.equal(adoptionDrop(26.3, 46), 19.7, "AI videos: Pro 46.0% to Studio 26.3%");
  assert.equal(adoptionDrop(21.1, 33.3), 12.2);
  assert.equal(adoptionDrop(42.1, 50.6), 8.5);
  assert.equal(adoptionDrop(41, 46), 5, "exactly 5 points is shown");
});

test("no drop is shown for a rise, a drop under 5 points, equal shares or a plan before without the feature", () => {
  assert.equal(adoptionDrop(80.5, 72.6), null, "a rise");
  assert.equal(adoptionDrop(52.6, 52.9), null, "under 5 points");
  assert.equal(adoptionDrop(52.6, 52.6), null);
  assert.equal(adoptionDrop(50.6, null), null);
});

test("every share has one decimal", () => {
  assert.equal(formatShare(69), "69.0%");
  assert.equal(formatShare(46), "46.0%");
  assert.equal(formatShare(72.64), "72.6%");
  assert.equal(formatShare(0), "0.0%");
});

test("underused is strictly below the threshold", () => {
  assert.equal(isUnderused(29.9, 30), true);
  assert.equal(isUnderused(30, 30), false);
});

test("an (AI) suffix becomes a badge", () => {
  assert.deepEqual(splitAiLabel("Lifestyle mockups (AI)"), { name: "Lifestyle mockups", ai: true });
  assert.deepEqual(splitAiLabel("AI videos"), { name: "AI videos", ai: false });
});

test("features keep the workflow order, unknown ones last", () => {
  const rows = ["exports", "mockups", "design_images", "new_thing", "ai_videos"].map((metric) => ({
    metric,
  }));

  assert.deepEqual(
    orderFeatures(rows).map((row) => row.metric),
    ["design_images", "mockups", "ai_videos", "exports", "new_thing"]
  );
  assert.deepEqual(orderFeatures([]), []);
});

const feature = (metric: string, label: string, rate: number | null) => ({
  metric,
  label,
  includedInPlan: rate !== null,
  rate: rate ?? 0,
});

test("the summary names the clear drops by plan, biggest first, and the underused features", () => {
  const plans = [
    {
      name: "Starter",
      adoption: [
        feature("ai_videos", "AI videos", null),
        feature("uploaded", "Uploaded mockups", 10.6),
        feature("design", "Design images", 72.6),
      ],
    },
    {
      name: "Pro",
      adoption: [
        feature("ai_videos", "AI videos", 46),
        feature("uploaded", "Uploaded mockups", 21.8),
        feature("design", "Design images", 80.5),
      ],
    },
    {
      name: "Studio",
      adoption: [
        feature("ai_videos", "AI videos", 26.3),
        feature("uploaded", "Uploaded mockups", 31.6),
        feature("design", "Design images", 86.8),
      ],
    },
  ];
  plans[1].adoption.push(feature("lifestyle", "Lifestyle mockups (AI)", 50.6));
  plans[2].adoption.push(feature("lifestyle", "Lifestyle mockups (AI)", 42.1));

  assert.deepEqual(adoptionSummary(plans, 30), [
    "2 AI features are used less on Studio than on Pro: AI videos (▼19.7), Lifestyle mockups (▼8.5).",
    "Used by under 30% of Sellers: Uploaded mockups on Starter and Pro; AI videos on Studio.",
  ]);
});

test("the summary names Sellers who reached a daily cap, and only then", () => {
  const capped = [
    {
      name: "Starter",
      adoption: [
        { ...feature("mockups", "Rendered mockups", 67.3), dailyCap: 300, usersAtDailyCap: 2 },
        { ...feature("listings", "Listings", 69), dailyCap: 100, usersAtDailyCap: 0 },
      ],
    },
  ];

  assert.deepEqual(adoptionSummary(capped, 30), ["2 Sellers on Starter reached the daily rendered mockups cap (300 a day)."]);
});

test("the summary is empty when nothing stands out", () => {
  const plans = [
    { name: "Starter", adoption: [feature("design", "Design images", 72.6)] },
    { name: "Pro", adoption: [feature("design", "Design images", 80.5)] },
  ];
  assert.deepEqual(adoptionSummary(plans, 30), []);
});
