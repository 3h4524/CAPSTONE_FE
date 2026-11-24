import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { videoWorkflowKeys } from "@/api/video-workflow";
import { useReviewDesignMockups } from "@/hooks/mutations/use-review-design-mockups";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import type { MockupAsset } from "@/types/video-workflow";
import { act, waitFor } from "@testing-library/react";

const REVIEW_URL = new URL(
  "/api/products/prod-1/mockup-assets/review-design",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const mockRegions = {
  focalPoint: null,
  product: null,
  artwork: null,
  detail: null,
};

const mockAssets: MockupAsset[] = [
  {
    id: "asset-1",
    productId: "prod-1",
    sourceType: "template",
    role: "primary",
    artworkGroupKey: null,
    variantKey: null,
    revision: 1,
    approvalStatus: "approved",
    approvedRevision: 1,
    width: 800,
    height: 800,
    regions: mockRegions,
    previewUrl: "/mockup-1.jpg",
    warnings: [],
  },
  {
    id: "asset-2",
    productId: "prod-1",
    sourceType: "lifestyle",
    role: "lifestyle",
    artworkGroupKey: null,
    variantKey: null,
    revision: 1,
    approvalStatus: "rejected",
    approvedRevision: null,
    width: 800,
    height: 800,
    regions: mockRegions,
    previewUrl: "/mockup-2.jpg",
    warnings: [],
  },
];

describe("useReviewDesignMockups", () => {
  it("posts to the review-design endpoint and updates the cached assets", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(REVIEW_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockAssets);
      })
    );

    const { result, queryClient } = renderQueryHook(() => useReviewDesignMockups());
    queryClient.setDefaultOptions({ queries: { gcTime: 60_000 } });

    queryClient.setQueryData(videoWorkflowKeys.assets("prod-1"), [
      { ...mockAssets[0], approvalStatus: "pending" },
      { ...mockAssets[1], approvalStatus: "pending" },
    ]);

    act(() => {
      result.current.mutate({
        productId: "prod-1",
        designImageId: "design-1",
        approvedMockupAssetIds: ["asset-1"],
        rejectedMockupAssetIds: ["asset-2"],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(capturedBody).toEqual({
      designImageId: "design-1",
      approvedMockupAssetIds: ["asset-1"],
      rejectedMockupAssetIds: ["asset-2"],
    });

    const cached = queryClient.getQueryData<MockupAsset[]>(videoWorkflowKeys.assets("prod-1"));
    expect(cached).toEqual(mockAssets);
  });
});
