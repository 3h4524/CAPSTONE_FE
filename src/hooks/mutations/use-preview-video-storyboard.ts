"use client";
import { previewVideoStoryboard } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const usePreviewVideoStoryboard = (suppressErrorToast = false) => useMutation({ mutationFn: previewVideoStoryboard, suppressErrorToast });
