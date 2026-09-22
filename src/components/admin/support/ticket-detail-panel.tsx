import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Copy, Download, FileText, Folder, Headphones, Image as ImageIcon, Lock, Mail, MoreVertical, Paperclip, Send, Smile, User, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useReplyAdminTicket, useUpdateAdminTicketStatus } from "@/hooks/mutations/use-admin-support-reply";
import { useAdminSupportTicketDetail } from "@/hooks/queries/use-admin-support-tickets";
import type { TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

type TicketDetailPanelProps = {
  ticketId: string | null;
};

export const TicketDetailPanel = ({ ticketId }: TicketDetailPanelProps) => {
  const { data: ticket, isLoading, isError } = useAdminSupportTicketDetail(ticketId || undefined);
  const { mutate: sendReply, isPending: isSending } = useReplyAdminTicket();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateAdminTicketStatus();
  
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
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
        isInternalNote: isInternal,
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
      <div className="flex h-full flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Headphones className="size-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Select a ticket</h3>
        <p className="max-w-sm text-sm text-slate-500">
          Choose a support ticket from the list on the left to view details and respond to the user.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-indigo-600" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        Failed to load ticket details.
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      {/* Header */}
      <div className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
            <span className="text-sm font-medium text-slate-500">#{ticket.ticketNumber}</span>
            <button className="text-slate-400 transition-colors hover:text-slate-600"><Copy className="size-4" /></button>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Folder className="size-4 text-slate-400" />
              <span className="capitalize">{ticket.category.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="size-4 text-slate-400" />
              <span className="font-medium text-slate-700">{ticket.requesterName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-slate-400" />
              <span>{format(new Date(ticket.createdAtUtc), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={ticket.status} 
            onValueChange={(val) => handleStatusChange(val as TicketStatus)}
            disabled={isUpdatingStatus}
          >
            <SelectTrigger className="h-9 w-[130px] rounded-full border-slate-200 bg-white text-sm font-medium shadow-sm focus:ring-1 focus:ring-slate-300">
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
          <Button variant="outline" size="icon" className="size-9 rounded-full border-slate-200 text-slate-500 shadow-sm">
             <MoreVertical className="size-4" />
          </Button>
        </div>
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 space-y-8 overflow-y-auto bg-white p-6 md:px-10">
        
        {/* Original Request */}
        <div className="flex gap-4">
          <Avatar className="mt-1 size-10">
            <AvatarFallback className="bg-slate-200 text-sm font-semibold text-slate-600">
              {ticket.requesterName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="max-w-[70%] flex-1">
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[15px] font-bold text-slate-900">{ticket.requesterName}</span>
              <span className="text-[13px] font-medium text-slate-500">
                {format(new Date(ticket.createdAtUtc), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {ticket.description}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {ticket.attachments.map((file) => {
                    const isImage = file.mimeType?.includes("image") || file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return isImage ? (
                      <div key={file.id} className="relative max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="block max-h-[250px] overflow-hidden bg-slate-50">
                          <img src={file.downloadUrl} alt={file.fileName} className="w-full object-cover transition-opacity hover:opacity-90" />
                        </a>
                        <div className="flex items-center justify-between border-t border-slate-100 bg-white p-3">
                           <div className="flex flex-col">
                             <span className="max-w-[200px] truncate text-[13px] font-semibold text-slate-900">{file.fileName}</span>
                             <span className="text-[11px] font-medium tracking-wide text-slate-500">421 KB • JPG</span>
                           </div>
                           <a href={file.downloadUrl} download className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50">
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
                        className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                      >
                        <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <FileText className="size-4" />
                        </div>
                        <span className="max-w-[200px] truncate">{file.fileName}</span>
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
            <div key={reply.id} className={cn("group flex gap-4", isAdmin && "flex-row-reverse")}>
              <Avatar className="mt-1 size-10">
                <AvatarFallback className={cn("text-sm font-semibold", isAdmin ? "bg-slate-200 text-slate-700" : "bg-slate-200 text-slate-600")}>
                  {isAdmin ? reply.authorName.substring(0, 1).toUpperCase() : reply.authorName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn("flex max-w-[70%] flex-col", isAdmin ? "items-end" : "items-start")}>
                <div className={cn("mb-1.5 flex items-baseline gap-2", isAdmin && "flex-row-reverse")}>
                  <span className="text-[15px] font-bold text-slate-900">{reply.authorName}</span>
                  <span className="text-[13px] font-medium text-slate-500">
                    {format(new Date(reply.createdAtUtc), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  {reply.isInternalNote && (
                    <Badge variant="secondary" className="border-transparent bg-amber-100 px-1.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase hover:bg-amber-100">
                      Internal Note
                    </Badge>
                  )}
                </div>
                <div 
                  className={cn(
                    "rounded-2xl p-4 text-[15px] leading-relaxed whitespace-pre-wrap",
                    isAdmin 
                      ? reply.isInternalNote 
                        ? "rounded-tr-sm border border-amber-200/50 bg-amber-50 text-amber-900 shadow-sm" 
                        : "rounded-tr-sm bg-[#eff6ff] text-slate-800"
                      : "rounded-tl-sm border border-slate-100 bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  )}
                >
                  {reply.replyText}
                  {reply.attachments && reply.attachments.length > 0 && (
                    <div className="mt-4 flex flex-col gap-3">
                      {reply.attachments.map((file) => {
                        const isImage = file.mimeType?.includes("image") || file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        return isImage ? (
                          <div key={file.id} className="relative max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
                            <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="block max-h-[250px] overflow-hidden bg-slate-50">
                              <img src={file.downloadUrl} alt={file.fileName} className="w-full object-cover transition-opacity hover:opacity-90" />
                            </a>
                            <div className="flex items-center justify-between border-t border-slate-100 bg-white p-3">
                               <div className="flex flex-col">
                                 <span className="max-w-[200px] truncate text-[13px] font-semibold text-slate-900">{file.fileName}</span>
                                 <span className="text-[11px] font-medium tracking-wide text-slate-500">421 KB • JPG</span>
                               </div>
                               <a href={file.downloadUrl} download className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50">
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
                            className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                              <FileText className="size-4" />
                            </div>
                            <span className="max-w-[200px] truncate">{file.fileName}</span>
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
        <div className="border-t border-slate-200 bg-slate-50 p-6">
          {/* Tabs */}
          <div className="mb-4 flex items-center gap-6 px-2">
            <button 
              onClick={() => setIsInternal(false)}
              className={cn("flex items-center gap-2 pb-1.5 text-[15px] font-semibold transition-colors", !isInternal ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500 hover:text-slate-700")}
            >
              <Mail className="size-4" /> Reply
            </button>
            <button 
              onClick={() => setIsInternal(true)}
              className={cn("flex items-center gap-2 pb-1.5 text-[15px] font-semibold transition-colors", isInternal ? "border-b-2 border-amber-600 text-amber-600" : "text-slate-500 hover:text-slate-700")}
            >
              <Lock className="size-4" /> Internal Note
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:ring-1 focus-within:ring-slate-300">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 pb-0">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                    <FileText className="size-3.5 text-slate-400" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => removeAttachment(index)} className="ml-1 text-slate-400 hover:text-slate-700"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a reply..."
              className="min-h-[120px] resize-none border-none bg-transparent p-4 text-[15px] focus-visible:ring-0"
            />
            <div className="flex items-center justify-between border-t border-slate-100 bg-white p-3">
              <div className="flex items-center gap-1 text-slate-400">
                <Button variant="ghost" size="icon" className="size-9 rounded-full hover:bg-slate-100" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="size-5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-9 rounded-full hover:bg-slate-100" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="size-5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-9 rounded-full hover:bg-slate-100">
                  <Smile className="size-5" />
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt" />
              </div>
              <Button 
                onClick={handleSend} 
                disabled={isSending || (!replyText.trim() && attachments.length === 0)}
                className={cn("h-10 gap-2 rounded-lg px-6 font-medium shadow-sm", isInternal ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-[#1e293b] text-white hover:bg-slate-800")}
              >
                {isSending ? <Spinner className="size-4" /> : <Send className="size-4" />}
                {isInternal ? "Add Note" : "Send Reply"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <CheckCircle2 className="size-4 text-slate-400" />
            <span>This ticket is {ticket.status}. No further replies can be added.</span>
          </div>
        </div>
      )}
    </div>
  );
};
