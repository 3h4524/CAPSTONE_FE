"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MessageSquareText, Paperclip, Send, Star, X } from "lucide-react";
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
        className="flex h-[calc(100dvh-40px)] max-h-[720px] w-[calc(100%-40px)] max-w-[840px] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl duration-200 motion-reduce:animate-none motion-reduce:transition-none"
      >
        {detailQuery.isPending ? (
          <SectionLoading label="Loading ticket details" />
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

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="space-y-6 px-5 py-6 sm:px-6">
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
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
        {canReply ? (
          <form
            className="flex flex-col"
            onSubmit={handleSubmit((values) => replyMutation.mutate({
              id: ticket.id,
              replyText: values.replyText,
              attachments: files,
            }))}
          >
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="ticket-reply" className="text-[15px] font-semibold text-slate-900">Add a reply</label>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:ring-1 focus-within:ring-slate-300">
              {files.length > 0 && (
                <div className="p-4 pb-0">
                  <TicketDropzone files={files} onChange={setFiles} disabled={replyMutation.isPending} />
                </div>
              )}
              <Textarea
                id="ticket-reply"
                placeholder="Write a message..."
                className="min-h-[100px] resize-none border-none bg-transparent p-4 text-[15px] shadow-none focus-visible:ring-0"
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
              <div className="flex items-center justify-between border-t border-slate-100 bg-white p-3">
                <div className="flex items-center gap-3">
                  <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100">
                    <Paperclip className="size-4" aria-hidden="true" /> 
                    Attach
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
                  <span className="hidden text-xs text-slate-500 sm:inline">Typical response within 1 business day</span>
                </div>
                <Button type="submit" className="h-10 gap-2 rounded-lg bg-[#1e293b] px-6 font-medium text-white shadow-sm hover:bg-slate-800" disabled={replyMutation.isPending || (!replyTextValue.trim() && files.length === 0)}>
                  {replyMutation.isPending ? <Spinner aria-hidden="true" className="size-4" /> : <Send aria-hidden="true" className="size-4" />}
                  Send reply
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
    <div className={cn("flex w-full gap-4", !support && "flex-row-reverse")}>
      <div className={cn("mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", support ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700")}>
        {initials}
      </div>
      <div className={cn("flex max-w-[85%] flex-col", !support ? "items-end" : "items-start")}>
        <div className={cn("mb-1.5 flex items-baseline gap-2", !support && "flex-row-reverse")}>
          <span className="text-[15px] font-bold text-slate-900">{author}</span>
          <span className="text-[13px] font-medium text-slate-500">{formatTime(createdAt)}</span>
        </div>
        <div 
          className={cn(
            "rounded-2xl p-4 text-left text-[15px] leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
            !support 
              ? "rounded-tr-sm bg-[#eff6ff] text-slate-800" 
              : "rounded-tl-sm border border-slate-100 bg-white text-slate-800"
          )}
        >
          {message}
          {attachments.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {attachments.map((attachment) => {
                const isImage = attachment.mimeType?.includes("image") || attachment.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return isImage ? (
                  <div key={attachment.id} className="relative max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
                    <a href={attachment.downloadUrl} target="_blank" rel="noreferrer" className="block max-h-[250px] overflow-hidden bg-slate-50">
                      <img src={attachment.downloadUrl} alt={attachment.fileName} className="w-full object-cover transition-opacity hover:opacity-90" />
                    </a>
                    <div className="flex items-center justify-between border-t border-slate-100 bg-white p-3">
                       <div className="flex flex-col">
                         <span className="max-w-[200px] truncate text-[13px] font-semibold text-slate-900">{attachment.fileName}</span>
                         <span className="text-[11px] font-medium tracking-wide text-slate-500">Attachment</span>
                       </div>
                       <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onDownload(attachment)}>
                          <Download className="size-4" />
                       </Button>
                    </div>
                  </div>
                ) : (
                  <Button key={attachment.id} type="button" variant="outline" size="sm" className="max-w-full bg-white text-slate-700 hover:translate-y-0" onClick={() => onDownload(attachment)}>
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
