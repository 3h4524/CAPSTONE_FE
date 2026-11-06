"use client";

import {
  listLibraryModelPhotos,
  listModelPhotos,
  modelPhotoKeys,
  type ModelPhotoScope,
} from "@/api/model-photos";
import { useQuery } from "@/hooks/queries/use-query";
import type { ModelPhotoFilter } from "@/types/mockup-templates";

/**
 * A seller's model photos for a product type (the library and their own), or the library for an admin; only those
 * of the people `filter` asks for.
 */
export const useModelPhotos = (
  scope: ModelPhotoScope,
  productType?: string,
  enabled = true,
  filter?: ModelPhotoFilter
) =>
  useQuery({
    queryKey:
      scope === "admin" ? modelPhotoKeys.library(filter) : modelPhotoKeys.list(productType, filter),
    queryFn: () =>
      scope === "admin" ? listLibraryModelPhotos(filter) : listModelPhotos(productType, filter),
    enabled,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
  });
