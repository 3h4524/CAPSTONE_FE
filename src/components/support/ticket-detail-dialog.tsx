"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, MessageSquareText, Paperclip, Send, Star, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-badges";
import { TicketDropzone } from "@/components/support/ticket-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABELS } from "@/constants/support";
import { useRateSupportTicket } from "@/hooks/mutations/use-rate-support-ticket";
import { useReplySupportTicket } from "@/hooks/mutations/use-reply-support-ticket";
import { useSupportTicket } from "@/hooks/queries/use-support-ticket";
import { useSupportHub } from "@/hooks/use-support-hub";
import { type ReplySupportTicketFormValues,replySupportTicketSchema } from "@/schemas/support-ticket";
import type { SupportTicketAttachment, SupportTicketDetail } from "@/types/support";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

type TicketDetailDialogProps = {
  ticketId: string | null;
  onClose: () => void;
};

export function TicketDetailDialog({ ticketId, onClose }: TicketDetailDialogProps) {
  const detailQuery = useSupportTicket(ticketId);
  useSupportHub(ticketId ?? undefined);

  return (
    <Dialog open={Boolean(ticketId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="border-ink-200 bg-card flex h-[calc(100dvh-40px)] max-h-[720px] w-[calc(100%-40px)] max-w-[840px] flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl duration-200 [--dialog-phone-height:100dvh] motion-reduce:animate-none motion-reduce:transition-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none max-md:border-0"
      >
        {detailQuery.isPending ? (
          <SectionLoading label="Loading ticket details" />
        ) : detailQuery.isError || !detailQuery.data ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
            <MessageSquareText className="text-ink-400 size-8" aria-hidden="true" />
            <div>
              <DialogTitle>Ticket unavailable</DialogTitle>
              <DialogDescription className="mt-2">We could not load this ticket. It may no longer be available.</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => detailQuery.refetch()}>Try again</Button>
            </div>
          </div>
        ) : (
          <TicketDetailContent ticket={detailQuery.data} onClose={onClose} refetch={detailQuery.refetch} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TicketDetailContent({
  ticket,
  onClose,
  refetch,
}: {
  ticket: SupportTicketDetail;
  onClose: () => void;
  refetch: () => Promise<{ data?: SupportTicketDetail }>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReplySupportTicketFormValues>({
    resolver: zodResolver(replySupportTicketSchema),
    defaultValues: { replyText: "" },
  });
  const replyTextValue = watch("replyText");
  const replyMutation = useReplySupportTicket(ticket.id, () => {
    reset();
    setFiles([]);
  });
  const ratingMutation = useRateSupportTicket(ticket.id);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket]);

  const download = async (attachment: SupportTicketAttachment) => {
    let target = attachment;
    if (new Date(attachment.downloadUrlExpiresAtUtc).getTime() <= Date.now() + 5_000) {
      const refreshed = await refetch();
      const all = [
        ...(refreshed.data?.attachments ?? []),
        ...(refreshed.data?.replies.flatMap((reply) => reply.attachments) ?? []),
      ];
      target = all.find((item) => item.id === attachment.id) ?? attachment;
    }
    window.open(target.downloadUrl, "_blank", "noopener,noreferrer");
  };

  const canReply = ticket.status !== "resolved" && ticket.status !== "closed";

  return (
    <>
      <DialogHeader className="border-ink-100 relative gap-3 border-b px-5 py-5 pr-16 text-left max-md:gap-1 max-md:px-4 max-md:py-2 max-md:pr-4 sm:px-6">
        <div className="flex min-h-11 items-center justify-between gap-3 md:hidden">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 px-2 hover:translate-y-0" onClick={onClose}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            All tickets
          </Button>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <div className="text-ink-500 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.12em] max-md:order-last max-md:gap-x-1.5 max-md:gap-y-1 max-md:text-[10px]">
          <span>{ticket.ticketNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{CATEGORY_LABELS[ticket.category].toUpperCase()}</span>
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
        <DialogTitle className="font-display pr-2 text-xl leading-7 tracking-tight wrap-anywhere max-md:pr-0 max-md:text-base max-md:leading-6">{ticket.subject}</DialogTitle>
        <DialogDescription asChild>
          <div className="max-md:hidden"><TicketStatusBadge status={ticket.status} /></div>
        </DialogDescription>
        <Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 size-11 hover:translate-y-0 max-md:hidden" onClick={onClose} aria-label="Close ticket details">
          <X aria-hidden="true" />
        </Button>
      </DialogHeader>

      <div ref={scrollRef} className="bg-card min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-5 py-6 max-md:space-y-4 max-md:px-4 max-md:py-4 sm:px-6">
          <ConversationItem
            author="You"
            initials={getInitials(ticket.requesterName)}
            message={ticket.description}
            createdAt={ticket.createdAtUtc}
            attachments={ticket.attachments}
            onDownload={download}
          />
          {ticket.replies.map((reply) => (
            <ConversationItem
              key={reply.id}
              author={reply.authorRole === "Admin" ? "Podivo Support" : "You"}
              initials={reply.authorRole === "Admin" ? "A" : getInitials(ticket.requesterName)}
              message={reply.replyText}
              createdAt={reply.createdAtUtc}
              attachments={reply.attachments}
              onDownload={download}
              support={reply.authorRole === "Admin"}
            />
          ))}
        </div>
      </div>

      <div className="border-ink-200 bg-ink-50 shrink-0 border-t px-5 py-5 max-md:p-2 sm:px-6">
        {canReply ? (
          <form
            className="flex flex-col"
            onSubmit={handleSubmit((values) => replyMutation.mutate({
              id: ticket.id,
              replyText: values.replyText,
              attachments: files,
            }))}
          >
            <div className="mb-3 flex items-center justify-between max-md:sr-only">
              <label htmlFor="ticket-reply" className="text-ink-900 text-[15px] font-semibold">Add a reply</label>
            </div>
            
            <div className="border-ink-200 bg-card focus-within:ring-ink-300 overflow-hidden rounded-xl border shadow-sm transition-all focus-within:ring-1 max-md:flex max-md:flex-wrap max-md:items-end max-md:rounded-3xl max-md:p-0.5">
              {files.length > 0 && (
                <div className="p-4 pb-0 max-md:order-first max-md:w-full max-md:p-2 max-md:pb-0">
                  <TicketDropzone files={files} onChange={setFiles} disabled={replyMutation.isPending} />
                </div>
              )}
              <Textarea
                id="ticket-reply"
                placeholder="Write a message..."
                className="min-h-[100px] resize-none border-none bg-transparent p-4 text-[15px] shadow-none focus-visible:ring-0 max-md:max-h-28 max-md:min-h-10 max-md:w-0 max-md:min-w-0 max-md:flex-1 max-md:rounded-none max-md:px-1 max-md:py-2 max-md:text-base max-md:leading-6"
                aria-invalid={Boolean(errors.replyText)}
                {...register("replyText")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!replyMutation.isPending && (replyTextValue.trim() || files.length > 0)) {
                      handleSubmit((values) => replyMutation.mutate({
                        id: ticket.id,
                        replyText: values.replyText,
                        attachments: files,
                      }))(e as unknown as React.BaseSyntheticEvent);
                    }
                  }
                }}
              />
              <div className="border-ink-100 bg-card flex items-center justify-between border-t p-3 max-md:contents">
                <div className="flex items-center gap-3 max-md:order-first">
                  <label aria-label="Attach a file" className="text-ink-600 hover:bg-ink-100 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors max-md:size-10 max-md:rounded-full max-md:px-0">
                    <Paperclip className="size-4 max-md:size-5" aria-hidden="true" />
                    <span className="max-md:sr-only">Attach</span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.log"
                      onChange={(event) => {
                        setFiles(Array.from(event.target.files ?? []).slice(0, 5));
                        event.target.value = "";
                        document.getElementById("ticket-reply")?.focus();
                      }}
                    />
                  </label>
                  <span className="text-ink-500 hidden text-xs sm:inline">Typical response within 1 business day</span>
                </div>
                <Button type="submit" aria-label="Send reply" className="bg-ink-800 text-card hover:bg-ink-900 max-md:disabled:bg-ink-200 max-md:disabled:text-ink-400 h-10 gap-2 rounded-lg px-6 font-medium shadow-sm max-md:order-3 max-md:size-10 max-md:rounded-full max-md:p-0 max-md:disabled:opacity-100 [@media(pointer:coarse)]:min-h-10" disabled={replyMutation.isPending || (!replyTextValue.trim() && files.length === 0)}>
                  {replyMutation.isPending ? <Spinner aria-hidden="true" className="size-4" /> : <Send aria-hidden="true" className="size-4" />}
                  <span className="max-md:sr-only">Send reply</span>
                </Button>
              </div>
            </div>
            {errors.replyText ? <p role="alert" className="text-destructive mt-2 text-xs">{errors.replyText.message}</p> : null}
          </form>
        ) : ticket.status === "resolved" ? (
          <RatingPanel
            rating={ticket.satisfactionRating}
            pending={ratingMutation.isPending}
            onRate={(rating) => ratingMutation.mutate({ id: ticket.id, rating })}
          />
        ) : (
          <p className="text-ink-600 py-2 text-center text-sm">This ticket is closed and can no longer receive replies.</p>
        )}
      </div>
    </>
  );
}

function ConversationItem({
  author,
  initials,
  message,
  createdAt,
  attachments,
  onDownload,
  support = false,
}: {
  author: string;
  initials: string;
  message: string;
  createdAt: string;
  attachments: SupportTicketAttachment[];
  onDownload: (attachment: SupportTicketAttachment) => void;
  support?: boolean;
}) {
  return (
    <div className={cn("flex w-full gap-4 max-md:gap-2.5", !support && "flex-row-reverse")}>
      <div className={cn("mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold max-md:size-8 max-md:text-xs", support ? "bg-ink-200 text-ink-700" : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300")}>
        {initials}
      </div>
      <div className={cn("flex max-w-[85%] min-w-0 flex-col max-md:max-w-none max-md:flex-1", !support ? "items-end" : "items-start")}>
        <div className={cn("mb-1.5 flex max-w-full items-baseline gap-2", !support && "flex-row-reverse")}>
          <span className="text-ink-900 text-[15px] font-bold max-md:min-w-0 max-md:truncate max-md:text-sm">{author}</span>
          <span className="text-ink-500 text-[13px] font-medium max-md:shrink-0 max-md:text-xs max-md:whitespace-nowrap">{formatTime(createdAt)}</span>
        </div>
        <div 
          className={cn(
            "max-w-full min-w-0 rounded-2xl p-4 text-left text-[15px] leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgba(0,0,0,0.05)] max-md:px-3 max-md:py-2 max-md:text-sm",
            !message && "max-md:p-1.5",
            !support 
              ? "bg-ink-100 text-ink-800 rounded-tr-sm" 
              : "border-ink-100 bg-card text-ink-800 rounded-tl-sm border"
          )}
        >
          {message}
          {attachments.length > 0 && (
            <div className={cn("mt-4 flex flex-col gap-3", !message && "max-md:mt-0")}>
              {attachments.map((attachment) => {
                const isImage = attachment.mimeType?.includes("image") || attachment.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return isImage ? (
                  <div key={attachment.id} className="border-ink-200 bg-card relative max-w-sm overflow-hidden rounded-xl border text-left shadow-sm">
                    <a href={attachment.downloadUrl} target="_blank" rel="noreferrer" className="bg-ink-50 block max-h-[250px] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={attachment.downloadUrl} alt={attachment.fileName} className="w-full object-cover transition-opacity hover:opacity-90" />
                    </a>
                    <div className="border-ink-100 bg-card flex items-center justify-between gap-2 border-t p-3 max-md:p-2">
                       <div className="flex min-w-0 flex-col">
                         <span className="text-ink-900 max-w-[200px] truncate text-[13px] font-semibold max-md:max-w-none">{attachment.fileName}</span>
                         <span className="text-ink-500 text-[11px] font-medium tracking-wide">Attachment</span>
                       </div>
                       <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onDownload(attachment)}>
                          <Download className="size-4" />
                       </Button>
                    </div>
                  </div>
                ) : (
                  <Button key={attachment.id} type="button" variant="outline" size="sm" className="bg-card text-ink-700 max-w-full hover:translate-y-0" onClick={() => onDownload(attachment)}>
                    <Download className="size-4" aria-hidden="true" />
                    <span className="truncate">{attachment.fileName}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RatingPanel({ rating, pending, onRate }: { rating: number | null; pending: boolean; onRate: (rating: number) => void }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <p className="text-ink-800 font-semibold">How was your support experience?</p>
      <p className="text-ink-600 mt-1 text-sm">Your feedback helps us improve.</p>
      <div className="mt-3 flex justify-center gap-1" aria-label={rating ? `Rated ${rating} out of 5` : "Rate from 1 to 5 stars"}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className="focus-visible:ring-ring flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-3 disabled:cursor-default"
            disabled={pending || rating !== null}
            onClick={() => onRate(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
          >
            <Star className={`size-6 ${rating && value <= rating ? "fill-amber-400 text-amber-500" : "text-ink-400"}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      {rating ? <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">You rated this ticket {rating}/5.</p> : null}
    </div>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Y";
}

function formatTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)} hr ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
