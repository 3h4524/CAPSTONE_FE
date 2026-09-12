"use client";

import { useState } from "react";
import { Download, MessageSquareText, Paperclip, Send, Star, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-badges";
import { TicketDropzone } from "@/components/support/ticket-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABELS } from "@/constants/support";
import { useRateSupportTicket } from "@/hooks/mutations/use-rate-support-ticket";
import { useReplySupportTicket } from "@/hooks/mutations/use-reply-support-ticket";
import { useSupportTicket } from "@/hooks/queries/use-support-ticket";
import { type ReplySupportTicketFormValues,replySupportTicketSchema } from "@/schemas/support-ticket";
import type { SupportTicketAttachment, SupportTicketDetail } from "@/types/support";
import { zodResolver } from "@hookform/resolvers/zod";

type TicketDetailDialogProps = {
  ticketId: string | null;
  onClose: () => void;
};

export function TicketDetailDialog({ ticketId, onClose }: TicketDetailDialogProps) {
  const detailQuery = useSupportTicket(ticketId);

  return (
    <Dialog open={Boolean(ticketId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-16px)] w-[calc(100%-16px)] max-w-[600px] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl duration-200 motion-reduce:animate-none motion-reduce:transition-none"
      >
        {detailQuery.isPending ? (
          <TicketDetailSkeleton />
        ) : detailQuery.isError || !detailQuery.data ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
            <MessageSquareText className="size-8 text-slate-400" aria-hidden="true" />
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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReplySupportTicketFormValues>({
    resolver: zodResolver(replySupportTicketSchema),
    defaultValues: { replyText: "" },
  });
  const replyMutation = useReplySupportTicket(ticket.id, () => {
    reset();
    setFiles([]);
  });
  const ratingMutation = useRateSupportTicket(ticket.id);

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
      <DialogHeader className="relative gap-3 border-b border-slate-100 px-5 py-5 pr-16 text-left sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-slate-500">
          <span>{ticket.ticketNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{CATEGORY_LABELS[ticket.category].toUpperCase()}</span>
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
        <DialogTitle className="font-display pr-2 text-xl leading-7 tracking-tight">{ticket.subject}</DialogTitle>
        <DialogDescription asChild>
          <div><TicketStatusBadge status={ticket.status} /></div>
        </DialogDescription>
        <Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 size-11 hover:translate-y-0" onClick={onClose} aria-label="Close ticket details">
          <X aria-hidden="true" />
        </Button>
      </DialogHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 bg-white px-5 py-4 sm:px-6">
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
              author={reply.authorRole === "Admin" ? "APCS Support" : "You"}
              initials={reply.authorRole === "Admin" ? "A" : getInitials(ticket.requesterName)}
              message={reply.replyText}
              createdAt={reply.createdAtUtc}
              attachments={reply.attachments}
              onDownload={download}
              support={reply.authorRole === "Admin"}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
        {canReply ? (
          <form
            className="space-y-3"
            onSubmit={handleSubmit((values) => replyMutation.mutate({
              id: ticket.id,
              replyText: values.replyText,
              attachments: files,
            }))}
          >
            <label htmlFor="ticket-reply" className="text-sm font-semibold text-slate-700">Add a reply</label>
            <Textarea
              id="ticket-reply"
              placeholder="Write a message..."
              className="min-h-24 resize-y bg-white"
              aria-invalid={Boolean(errors.replyText)}
              {...register("replyText")}
            />
            {errors.replyText ? <p role="alert" className="text-destructive text-xs">{errors.replyText.message}</p> : null}
            {files.length > 0 ? <TicketDropzone files={files} onChange={setFiles} disabled={replyMutation.isPending} /> : null}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="focus-within:ring-ring/30 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 focus-within:ring-3">
                  <Paperclip className="size-4" aria-hidden="true" /> Attach
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.log"
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                  />
                </label>
                <span className="hidden text-xs text-slate-500 sm:inline">Typical response within one business day</span>
              </div>
              <Button type="submit" className="min-h-11 px-5 hover:translate-y-0" disabled={replyMutation.isPending}>
                {replyMutation.isPending ? <Spinner aria-hidden="true" /> : <Send aria-hidden="true" />}
                Send reply
              </Button>
            </div>
          </form>
        ) : ticket.status === "resolved" ? (
          <RatingPanel
            rating={ticket.satisfactionRating}
            pending={ratingMutation.isPending}
            onRate={(rating) => ratingMutation.mutate({ id: ticket.id, rating })}
          />
        ) : (
          <p className="py-2 text-center text-sm text-slate-600">This ticket is closed and can no longer receive replies.</p>
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
    <article className={`rounded-xl border p-3.5 ${support ? "border-blue-100 bg-[#edf4ff]" : "border-slate-100 bg-[#f6f8fc]"}`}>
      <div className="flex items-start gap-3">
        <div className="text-primary flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#dbe7fb] text-xs font-bold">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{author}</p>
            <time className="shrink-0 text-xs text-slate-500" dateTime={createdAt}>{formatTime(createdAt)}</time>
          </div>
          <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-slate-700">{message}</p>
          {attachments.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <Button key={attachment.id} type="button" variant="outline" size="sm" className="max-w-full hover:translate-y-0" onClick={() => onDownload(attachment)}>
                  <Download aria-hidden="true" />
                  <span className="truncate">{attachment.fileName}</span>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RatingPanel({ rating, pending, onRate }: { rating: number | null; pending: boolean; onRate: (rating: number) => void }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
      <p className="font-semibold text-slate-800">How was your support experience?</p>
      <p className="mt-1 text-sm text-slate-600">Your feedback helps us improve.</p>
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
            <Star className={`size-6 ${rating && value <= rating ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      {rating ? <p className="mt-1 text-sm font-medium text-emerald-700">You rated this ticket {rating}/5.</p> : null}
    </div>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="space-y-5 p-6" aria-label="Loading ticket details">
      <DialogTitle className="sr-only">Loading ticket details</DialogTitle>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
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
