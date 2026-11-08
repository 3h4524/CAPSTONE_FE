import { describe, expect, it } from "vitest";

import type { MarketListingPoint, SellerNicheMarketInsight, SellerOpportunity } from "@/api/market-opportunities";
import { buildNicheMap, buildPriceSweetSpot, buildProfileImpact, buildSeasonalWindows } from "@/components/opportunities/market-insights";

const point = (price: number, favoritesPer30Days: number): MarketListingPoint => ({
  title: `listing ${price}`,
  price,
  favoritesPer30Days,
  ageDays: 30,
  isNew: false,
  url: null,
});

const opportunity = (id: string, niche: string, finalScore: number, state: SellerOpportunity["state"] = "new") =>
  ({ id, niche, title: niche, finalScore, state }) as SellerOpportunity;

const niche = (name: string, strong: number, sellers: number, favorites: number) =>
  ({
    niche: name,
    signals: { sellerCount: sellers, strongSellerCount: strong, medianFavoritesPer30Days: favorites },
    marketSupply: { activeListingCount: 1000 },
  }) as SellerNicheMarketInsight;

describe("buildPriceSweetSpot", () => {
  it("picks the price quartile where listings most often draw interest", () => {
    const points = [
      ...[10, 11, 12, 13].map((price) => point(price, 0)),
      ...[20, 21, 22, 23].map((price, index) => point(price, index === 0 ? 2 : 0)),
      ...[30, 31, 32, 33].map((price, index) => point(price, index < 3 ? 4 : 0)),
      ...[40, 41, 42, 43].map((price) => point(price, 0)),
    ];

    const result = buildPriceSweetSpot(points);

    expect(result?.bands).toHaveLength(4);
    expect(result?.overallPercent).toBe(25);
    expect(result?.best).toMatchObject({ from: 30, to: 33, activeCount: 3, activePercent: 75 });
    expect(result?.best?.listings[0].favoritesPer30Days).toBe(4);
  });

  it("does not crown a band whose lead over the niche is noise", () => {
    // Mostly zero-favorite listings with one fraction-of-a-favorite outlier: the case seen in real data.
    const points = Array.from({ length: 16 }, (_, index) => point(index + 1, index === 9 ? 0.1 : 0));
    expect(buildPriceSweetSpot(points)?.best).toBeNull();
  });

  it("needs twelve priced listings", () => {
    expect(buildPriceSweetSpot(Array.from({ length: 11 }, (_, index) => point(index + 1, 2)))).toBeNull();
  });
});

describe("buildNicheMap", () => {
  it("marks only niches better than the median on both interest and competition", () => {
    const map = buildNicheMap([
      niche("opening", 1, 20, 9),
      niche("crowded", 15, 20, 9),
      niche("quiet", 1, 20, 1),
      niche("middle", 8, 20, 4),
    ]);

    expect(map.points.filter((item) => item.isOpening).map((item) => item.niche)).toEqual(["opening"]);
  });

  it("leaves out niches without sellers", () => {
    expect(buildNicheMap([niche("empty", 0, 0, 3)]).points).toHaveLength(0);
  });
});

describe("buildProfileImpact", () => {
  const priced = (id: string, niche: string, finalScore: number, medianPrice: number) =>
    ({ ...opportunity(id, niche, finalScore), insights: { medianPrice } }) as unknown as SellerOpportunity;
  const profile = {
    shopGoal: "apparel",
    targetAudiences: ["moms"],
    preferredCategories: ["apparel"],
    excludedCategories: [],
    preferredKeywords: ["t-shirt", "hoodie", "embroidered"],
    minimumPrice: 20,
    maximumPrice: 40,
  };
  const radar = [
    priced("a", "custom t shirt", 90, 25),
    priced("b", "funny hoodie", 80, 45),
    priced("c", "golf shirt", 85, 30),
    priced("d", "golf shirt", 75, 30),
    priced("e", "tie dye shirt", 60, 15),
  ];

  it("counts the opportunities each keyword matches, treating hyphens as spaces", () => {
    const impact = buildProfileImpact(profile, radar);
    expect(impact.keywords).toEqual([
      { keyword: "t-shirt", matches: 1 },
      { keyword: "hoodie", matches: 1 },
      { keyword: "embroidered", matches: 0 },
    ]);
  });

  it("places each opportunity's typical price against the target range", () => {
    expect(buildProfileImpact(profile, radar).price).toMatchObject({ inside: 3, below: 1, above: 1, total: 5 });
  });

  it("suggests strong uncovered niches once, best score first", () => {
    // golf shirt appears twice and is uncovered; tie dye scores under the threshold.
    expect(buildProfileImpact(profile, radar).suggestions).toEqual([{ keyword: "golf shirt", score: 85 }]);
  });

  it("lists the profile fields still empty", () => {
    expect(buildProfileImpact({ ...profile, excludedCategories: [], minimumPrice: null, maximumPrice: null }, radar).missing).toEqual(["excluded", "price"]);
  });
});

describe("buildSeasonalWindows", () => {
  const today = new Date(2026, 10, 7);

  it("phases occasions by lead time and matches opportunities by wording", () => {
    const windows = buildSeasonalWindows(
      [
        opportunity("a", "ugly christmas sweater", 80),
        opportunity("b", "christmas family shirts", 90),
        opportunity("c", "thanksgiving shirt", 70),
        opportunity("d", "golf shirt", 95),
      ],
      today,
    );
    const byId = Object.fromEntries(windows.map((window) => [window.id, window]));

    // Thanksgiving 2026 is Thursday 26 November.
    expect(byId.thanksgiving).toMatchObject({ daysAway: 19, phase: "lastCall" });
    expect(byId.christmas).toMatchObject({ daysAway: 48, phase: "listNow" });
    expect(byId.christmas.matches.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("hides far-off occasions with no matching opportunity and skips ignored ones", () => {
    const windows = buildSeasonalWindows([opportunity("v", "valentines day shirt", 90, "ignored")], today);
    expect(windows.some((window) => window.id === "valentines")).toBe(false);
  });

  it("rolls an occasion that has passed to next year", () => {
    const windows = buildSeasonalWindows([opportunity("v", "valentines day shirt", 90)], new Date(2026, 1, 20));
    expect(windows.some((window) => window.id === "valentines")).toBe(false);
    const late = buildSeasonalWindows([opportunity("v", "valentines day shirt", 90)], new Date(2026, 11, 1));
    expect(late.find((window) => window.id === "valentines")?.date).toEqual(new Date(2027, 1, 14));
  });
});
