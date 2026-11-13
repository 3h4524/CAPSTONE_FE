"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, TriangleAlert } from "lucide-react";

import { getSocialShareKit, type SocialPlatform, type SocialPost } from "@/api/social";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useQuery } from "@tanstack/react-query";

const PLATFORMS: { value: SocialPlatform; label: string; how: string }[] = [
  { value: "pinterest", label: "Pinterest", how: "Create a Pin, upload the image or video, then paste the title, description, link and alt text." },
  { value: "tiktok", label: "TikTok", how: "Upload the video, or the photos as a photo post, then paste the caption. TikTok links only from your bio." },
];

const KIND_LABEL: Record<SocialPost["kind"], string> = { image: "Image pin", video: "Video", carousel: "Photo post" };

/**
 * A product's posts for Pinterest and TikTok, ready to publish by hand: files sized for each platform to download and
 * text written from the listing to copy. Nothing is posted from APCS.
 */
export const SocialShareDialog = ({ productId, open, onOpenChange }: { productId: string; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const kit = useQuery({ queryKey: ["social-share-kit", productId], queryFn: () => getSocialShareKit(productId), enabled: open, staleTime: 0 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Share to social</DialogTitle>
          <DialogDescription>Posts made from the approved mock-ups, video and listing. Download the files and copy the text into each app.</DialogDescription>
        </DialogHeader>
        {kit.isPending ? (
          <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm"><Loader2 className="size-4 animate-spin" />Preparing the posts…</p>
        ) : kit.isError ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-rose-700 dark:text-rose-300">{getErrorMessage(kit.error)}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => kit.refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {kit.data.warnings.length > 0 && (
              <ul className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {kit.data.warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-1.5"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{warning}</li>
                ))}
              </ul>
            )}
            <Tabs defaultValue="pinterest">
              <TabsList>
                {PLATFORMS.map((platform) => (
                  <TabsTrigger key={platform.value} value={platform.value}>
                    {platform.label} ({kit.data.posts.filter((post) => post.platform === platform.value).length})
                  </TabsTrigger>
                ))}
              </TabsList>
              {PLATFORMS.map((platform) => {
                const posts = kit.data.posts.filter((post) => post.platform === platform.value);
                return (
                  <TabsContent key={platform.value} value={platform.value} className="space-y-3 pt-2">
                    <p className="text-muted-foreground text-xs">{platform.how}</p>
                    {posts.length === 0 ? (
                      <p className="text-ink-600 text-sm">No {platform.label} post yet: see what to do above.</p>
                    ) : (
                      posts.map((post, index) => <PostCard key={`${post.kind}-${index}`} post={post} />)
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PostCard = ({ post }: { post: SocialPost }) => {
  return (
    <section className="border-ink-200 space-y-3 rounded-lg border p-3">
      <p className="text-ink-900 text-sm font-medium">{KIND_LABEL[post.kind]}{post.media.length > 1 ? ` · ${post.media.length} photos` : ""}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {post.media.map((media) => (
          <figure key={media.fileName} className="w-28 shrink-0 space-y-1">
            {media.type === "video" ? (
              <video src={media.previewUrl} className="bg-ink-100 aspect-[9/16] w-full rounded object-cover" controls muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- a signed, sized link from storage, not a static asset
              <img src={media.previewUrl} alt={post.altText ?? ""} className="bg-ink-100 w-full rounded object-contain" style={{ aspectRatio: `${media.width} / ${media.height}` }} />
            )}
            <a href={media.downloadUrl} download={media.fileName} className="text-ink-600 hover:text-ink-900 flex items-center gap-1 text-[11px]">
              <Download className="size-3" />{media.width}×{media.height}
            </a>
          </figure>
        ))}
      </div>
      {post.title && <CopyField label="Title" value={post.title} />}
      <CopyField label={post.platform === "pinterest" ? "Description" : "Caption"} value={post.caption} multiline />
      {post.link && <CopyField label="Link" value={post.link} href={post.link} />}
      {post.altText && <CopyField label="Alt text" value={post.altText} multiline />}
    </section>
  );
};

const CopyField = ({ label, value, multiline = false, href }: { label: string; value: string; multiline?: boolean; href?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("error", "Could not copy; select the text and copy it instead.");
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-ink-700 text-xs font-medium">{label}</span>
        <div className="flex items-center gap-1">
          {href && (
            <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <a href={href} target="_blank" rel="noreferrer"><ExternalLink className="size-3" />Open</a>
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copy}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <p className={`bg-ink-50 text-ink-900 rounded px-2 py-1.5 text-xs ${multiline ? "whitespace-pre-line" : "truncate"}`}>{value}</p>
    </div>
  );
};
