import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, CheckCircle2, Copy, Download, FileText, Folder, Headphones, Maximize2, Minimize2, Paperclip, Send, Star, User, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useReplyAdminTicket, useUpdateAdminTicketStatus } from "@/hooks/mutations/use-admin-support-reply";
import { useAdminSupportTicketDetail } from "@/hooks/queries/use-admin-support-tickets";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useSupportHub } from "@/hooks/use-support-hub";
import type { SupportTicketAttachment,TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

type TicketDetailPanelProps = {
  ticketId: string | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** Returns to the ticket list on narrow screens, where the list and detail panels swap. */
  onBack?: () => void;
};

const fileDetails = (file: SupportTicketAttachment) => {
  const size = file.fileSizeMb < 1 ? `${Math.max(1, Math.round(file.fileSizeMb * 1024))} KB` : `${file.fileSizeMb.toFixed(1)} MB`;
  const extension = file.fileName.split(".").pop()?.toUpperCase();
  return extension ? `${size} • ${extension}` : size;
};

const BackToListButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="ghost" size="sm" className="-ml-2 self-start px-2 md:hidden" onClick={onClick}>
    <ArrowLeft className="size-4" aria-hidden="true" />
    All tickets
  </Button>
);

export const TicketDetailPanel = ({ ticketId, isExpanded, onToggleExpand, onBack }: TicketDetailPanelProps) => {
  const isPhone = useIsPhone();
  // One short line on a phone, so the messages keep the room; a tap shows it all.
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const { data: ticket, isLoading, isError } = useAdminSupportTicketDetail(ticketId || undefined);
  useSupportHub(ticketId || undefined);
  const { mutate: sendReply, isPending: isSending } = useReplyAdminTicket();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateAdminTicketStatus();
  
  const [replyText, setReplyText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when data updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket]);

  const handleSend = () => {
    if (!ticketId || (!replyText.trim() && attachments.length === 0)) return;
    
    sendReply(
      {
        id: ticketId,
        replyText: replyText.trim(),
        attachments,
      },
      {
        onSuccess: () => {
          setReplyText("");
          setAttachments([]);
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      e.target.value = "";
      document.getElementById("admin-reply")?.focus();
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!ticketId) return;
    updateStatus({ id: ticketId, status: newStatus });
  };

  if (!ticketId) {
    return (
      <div className="bg-ink-50/50 flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="bg-ink-100 text-ink-400 mb-4 flex size-16 items-center justify-center rounded-full">
          <Headphones className="size-8" />
        </div>
        <h3 className="text-ink-900 mb-2 text-lg font-semibold">Select a ticket</h3>
        <p className="text-ink-500 max-w-sm text-sm">
          Choose a support ticket from the list on the left to view details and respond to the user.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        {onBack && <div className="p-4 md:hidden"><BackToListButton onClick={onBack} /></div>}
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex h-full flex-col">
        {onBack && <div className="p-4 md:hidden"><BackToListButton onClick={onBack} /></div>}
        <div className="flex flex-1 items-center justify-center text-sm text-red-500">
          Failed to load ticket details.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card relative flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-ink-200 bg-card relative z-10 flex flex-col items-start justify-between gap-4 border-b px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-md:gap-0 max-md:px-4 max-md:py-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-2 max-md:w-full max-md:gap-1">
          {onBack && <BackToListButton onClick={onBack} />}
          <div className="flex flex-wrap items-center gap-3 max-md:gap-x-2 max-md:gap-y-0">
            <h2 className="text-ink-900 text-xl font-bold wrap-anywhere max-md:w-full max-md:text-base">{ticket.subject}</h2>
            <span className="text-ink-500 text-sm font-medium wrap-anywhere max-md:text-xs">#{ticket.ticketNumber}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(ticket.ticketNumber);
                toast.success("Copied ticket ID");
              }}
              className="text-ink-400 hover:text-ink-600 transition-colors"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <div
            className={cn(
              "text-ink-600 flex flex-wrap items-center gap-4 text-sm max-md:gap-x-3 max-md:gap-y-1 max-md:text-xs sm:gap-6",
              !isSummaryOpen && "max-md:flex-nowrap max-md:overflow-hidden"
            )}
            {...(isPhone && {
              role: "button",
              tabIndex: 0,
              "aria-expanded": isSummaryOpen,
              "aria-label": "Show the ticket's details",
              onClick: () => setIsSummaryOpen((open) => !open),
            })}
          >
            <div className="flex shrink-0 items-center gap-2 max-md:gap-1">
              <Folder className="text-ink-400 size-4 max-md:size-3.5" />
              <span className="capitalize">{ticket.category.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-2 max-md:min-w-0 max-md:gap-1">
              <User className="text-ink-400 size-4 shrink-0 max-md:size-3.5" />
              <span className={cn("text-ink-700 font-medium", !isSummaryOpen && "max-md:truncate")}>{ticket.requesterName}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 max-md:gap-1">
              <Calendar className="text-ink-400 size-4 max-md:size-3.5" />
              <span>{formatRelativeDate(ticket.createdAtUtc)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 max-md:absolute max-md:top-2 max-md:right-4">
          <Select 
            value={ticket.status} 
            onValueChange={(val) => handleStatusChange(val as TicketStatus)}
            disabled={isUpdatingStatus}
          >
            <SelectTrigger className="border-ink-200 bg-card focus:ring-ink-300 h-9 w-[130px] rounded-full text-sm font-medium shadow-sm focus:ring-1">
              <div className="flex items-center gap-2">
                <div className={cn("size-2 rounded-full", ticket.status === "resolved" || ticket.status === "closed" ? "bg-emerald-500" : ticket.status === "in_progress" ? "bg-amber-500" : "bg-blue-600")} />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          {onToggleExpand && (
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleExpand}
              className="text-ink-500 hidden h-9 w-9 shadow-none md:flex"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="bg-card min-h-0 flex-1 space-y-8 overflow-y-auto p-4 max-md:space-y-4 md:p-6 md:px-10">
        
        {/* Original Request */}
        <div className="flex gap-4 max-md:gap-2.5">
          <Avatar className="mt-1 size-10 max-md:size-8">
            <AvatarFallback className="bg-ink-200 text-ink-600 text-sm font-semibold">
              {ticket.requesterName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="max-w-[85%] min-w-0 flex-1 max-md:max-w-none md:max-w-[70%]">
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-ink-900 text-[15px] font-bold max-md:min-w-0 max-md:truncate max-md:text-sm">{ticket.requesterName}</span>
              <span className="text-ink-500 text-[13px] font-medium max-md:shrink-0 max-md:text-xs max-md:whitespace-nowrap">
                {formatRelativeDate(ticket.createdAtUtc)}
              </span>
            </div>
            <div className="border-ink-100 bg-card text-ink-800 rounded-2xl rounded-tl-sm border p-4 text-[15px] leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgba(0,0,0,0.05)] max-md:px-3 max-md:py-2 max-md:text-sm">
              {ticket.description}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {ticket.attachments.map((file) => {
                    const isImage = file.mimeType?.includes("image") || file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return isImage ? (
                      <div key={file.id} className="border-ink-200 bg-card relative max-w-sm overflow-hidden rounded-xl border shadow-sm">
                        <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="bg-ink-50 block max-h-[250px] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={file.downloadUrl} alt={file.fileName} className="w-full object-cover transition-opacity hover:opacity-90" />
                        </a>
                        <div className="border-ink-100 bg-card flex items-center justify-between gap-2 border-t p-3 max-md:p-2">
                           <div className="flex min-w-0 flex-col">
                             <span className="text-ink-900 max-w-[200px] truncate text-[13px] font-semibold max-md:max-w-36">{file.fileName}</span>
                             <span className="text-ink-500 text-[11px] font-medium tracking-wide">{fileDetails(file)}</span>
                           </div>
                           <a href={file.downloadUrl} download className="border-ink-200 text-ink-500 hover:bg-ink-50 flex size-8 items-center justify-center rounded-lg border transition-colors">
                              <Download className="size-4" />
                           </a>
                        </div>
                      </div>
                    ) : (
                      <a 
                        key={file.id} 
                        href={file.downloadUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 flex w-fit max-w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] font-medium shadow-sm transition-colors"
                      >
                        <div className="bg-ink-100 text-ink-500 flex size-8 items-center justify-center rounded-md">
                          <FileText className="size-4" />
                        </div>
                        <span className="max-w-[200px] min-w-0 truncate">{file.fileName}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies.map((reply) => {
          const isAdmin = reply.authorRole === "Admin";
          return (
            <div key={reply.id} className={cn("group flex gap-4 max-md:gap-2.5", isAdmin && "flex-row-reverse")}>
              <Avatar className="mt-1 size-10 max-md:size-8">
                <AvatarFallback className={cn("text-sm font-semibold", isAdmin ? "bg-ink-200 text-ink-700" : "bg-ink-200 text-ink-600")}>
                  {isAdmin ? reply.authorName.substring(0, 1).toUpperCase() : reply.authorName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn("flex max-w-[85%] min-w-0 flex-col max-md:max-w-none max-md:flex-1 md:max-w-[70%]", isAdmin ? "items-end" : "items-start")}>
                <div className={cn("mb-1.5 flex max-w-full items-baseline gap-2", isAdmin && "flex-row-reverse")}>
                  <span className="text-ink-900 text-[15px] font-bold max-md:min-w-0 max-md:truncate max-md:text-sm">{reply.authorName}</span>
                  <span className="text-ink-500 text-[13px] font-medium max-md:shrink-0 max-md:text-xs max-md:whitespace-nowrap">
                    {formatRelativeDate(reply.createdAtUtc)}
                  </span>
                </div>
                <div 
                  className={cn(
                    "max-w-full rounded-2xl p-4 text-[15px] leading-relaxed whitespace-pre-wrap max-md:px-3 max-md:py-2 max-md:text-sm",
                    !reply.replyText && "max-md:p-1.5",
                    isAdmin 
                      ? "bg-ink-100 text-ink-800 rounded-tr-sm"
                      : "border-ink-100 bg-card text-ink-800 rounded-tl-sm border shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  )}
                >
                  {reply.replyText}
                  {reply.attachments && reply.attachments.length > 0 && (
                    <div className={cn("mt-4 flex flex-col gap-3", !reply.replyText && "max-md:mt-0")}>
                      {reply.attachments.map((file) => {
                        const isImage = file.mimeType?.includes("image") || file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return isImage ? (
                          <div key={file.id} className="border-ink-200 bg-card relative max-w-sm overflow-hidden rounded-xl border text-left shadow-sm">
                            <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="bg-ink-50 block max-h-[250px] overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={file.downloadUrl} alt={file.fileName} className="w-full object-cover transition-opacity hover:opacity-90" />
                            </a>
                            <div className="border-ink-100 bg-card flex items-center justify-between gap-2 border-t p-3 max-md:p-2">
                               <div className="flex min-w-0 flex-col">
                                 <span className="text-ink-900 max-w-[200px] truncate text-[13px] font-semibold max-md:max-w-36">{file.fileName}</span>
                                 <span className="text-ink-500 text-[11px] font-medium tracking-wide">{fileDetails(file)}</span>
                               </div>
                               <a href={file.downloadUrl} download className="border-ink-200 text-ink-500 hover:bg-ink-50 flex size-8 items-center justify-center rounded-lg border transition-colors">
                                  <Download className="size-4" />
                               </a>
                            </div>
                          </div>
                        ) : (
                          <a 
                            key={file.id} 
                            href={file.downloadUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 flex w-fit max-w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] font-medium shadow-sm transition-colors"
                          >
                            <div className="bg-ink-100 text-ink-500 flex size-8 items-center justify-center rounded-md">
                              <FileText className="size-4" />
                            </div>
                            <span className="max-w-[200px] min-w-0 truncate">{file.fileName}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Box */}
      {ticket.status !== "closed" && ticket.status !== "resolved" ? (
        <div className="border-ink-200 bg-ink-50 border-t p-4 max-md:p-2">
          <div className="border-ink-200 bg-card focus-within:ring-ink-300 overflow-hidden rounded-xl border shadow-sm transition-all focus-within:ring-1 max-md:flex max-md:flex-wrap max-md:items-end max-md:rounded-3xl max-md:p-0.5">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 pb-0 max-md:order-first max-md:w-full max-md:p-2 max-md:pb-0">
                {attachments.map((file, index) => (
                  <div key={index} className="border-ink-200 bg-ink-50 text-ink-600 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium">
                    <FileText className="text-ink-400 size-3.5" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => removeAttachment(index)} className="text-ink-400 hover:text-ink-700 ml-1"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              id="admin-reply"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reply..."
              className="min-h-[60px] resize-none border-none bg-transparent p-3 text-base focus-visible:ring-0 max-md:max-h-28 max-md:min-h-10 max-md:w-0 max-md:min-w-0 max-md:flex-1 max-md:rounded-none max-md:px-1 max-md:py-2 max-md:leading-6 max-md:shadow-none md:text-[14px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSending && (replyText.trim() || attachments.length > 0)) {
                    handleSend();
                  }
                }
              }}
            />
            <div className="border-ink-100 bg-card flex items-center justify-between border-t p-2 max-md:contents">
              <div className="text-ink-400 flex items-center gap-1 max-md:order-first">
                <Button variant="ghost" size="icon" aria-label="Attach a file" className="hover:bg-ink-100 size-9 rounded-full max-md:size-10 [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:min-w-10" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="size-5" />
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt" />
              </div>
              <Button 
                onClick={handleSend} 
                disabled={isSending || (!replyText.trim() && attachments.length === 0)}
                className="bg-ink-800 text-card hover:bg-ink-900 max-md:disabled:bg-ink-200 max-md:disabled:text-ink-400 h-8 gap-2 rounded-lg px-5 text-sm font-medium shadow-sm max-md:order-3 max-md:size-10 max-md:rounded-full max-md:p-0 max-md:disabled:opacity-100 [@media(pointer:coarse)]:min-h-10"
              >
                {isSending ? <Spinner className="size-4" /> : <Send className="size-4" />}
                <span className="max-md:sr-only">Send<span className="max-md:hidden"> Reply</span></span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-ink-200 bg-ink-50 border-t px-6 py-6 text-center">
          {ticket.satisfactionRating ? (
            <div className="mb-4">
              <h3 className="text-ink-900 text-sm font-semibold">Customer Satisfaction</h3>
              <div className="mt-2 flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={cn(
                      "size-5",
                      value <= ticket.satisfactionRating!
                        ? "fill-amber-400 text-amber-400"
                        : "fill-ink-100 text-ink-200"
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Rated {ticket.satisfactionRating}/5</p>
            </div>
          ) : ticket.status === "resolved" ? (
            <div className="text-ink-500 mb-4 text-sm">Waiting for customer to rate the support experience.</div>
          ) : null}
          <div className="text-ink-500 flex items-center justify-center gap-2 text-xs font-medium">
            <CheckCircle2 className="text-ink-400 size-4" />
            <span>This ticket is {ticket.status}. No further replies can be added.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const differenceMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return "Just now";
  if (differenceMinutes < 60) return `${differenceMinutes} min ago`;
  if (differenceMinutes < 1_440) return `${Math.floor(differenceMinutes / 60)} hr ago`;
  if (differenceMinutes < 2_880) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
};
