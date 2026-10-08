"use client";
import { mediaDownload } from "@/api/video-workflow";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useMediaDownload = () => useMutation({ mutationFn: mediaDownload });
