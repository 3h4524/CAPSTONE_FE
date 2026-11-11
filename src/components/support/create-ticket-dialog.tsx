"use client";

import { useEffect, useState } from "react";
import { Headset, Send, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { TicketDropzone } from "@/components/support/ticket-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/constants/support";
import { useCreateSupportTicket } from "@/hooks/mutations/use-create-support-ticket";
import {
  type CreateSupportTicketFormValues,
  createSupportTicketSchema,
} from "@/schemas/support-ticket";
import type { TicketCategory, TicketPriority } from "@/types/support";
import { zodResolver } from "@hookform/resolvers/zod";

type CreateTicketDialogProps = {
  open: boolean;
  initialSubject?: string;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function CreateTicketDialog({ open, initialSubject = "", onClose, onCreated }: CreateTicketDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const mutation = useCreateSupportTicket(onCreated);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupportTicketFormValues>({
    resolver: zodResolver(createSupportTicketSchema),
    defaultValues: {
      subject: "",
      category: "integration",
      priority: "normal",
      description: "",
    },
  });

  useEffect(() => {
    reset({
      subject: open ? initialSubject : "",
      category: "integration",
      priority: "normal",
      description: "",
    });
    setFiles([]);
  }, [initialSubject, open, reset]);

  const submit = handleSubmit((values) => {
    mutation.mutate({
      subject: values.subject,
      category: values.category as TicketCategory,
      priority: values.priority as TicketPriority,
      description: values.description,
      attachments: files,
    });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-card flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[840px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)] duration-200 motion-reduce:animate-none motion-reduce:transition-none"
      >
        <DialogHeader className="relative flex-row items-start gap-3 px-5 pt-6 pr-16 pb-3 text-left sm:px-6 sm:pt-7">
          <div className="text-primary bg-ink-100 flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Headset className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-ink-500 text-[10px] font-bold tracking-[0.16em]">NEW REQUEST</p>
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">Contact support</DialogTitle>
            <DialogDescription className="leading-5">
              Include the batch, provider, or error message if one is involved.
            </DialogDescription>
          </div>
          <Button type="button" variant="ghost" size="icon" className="text-ink-500 hover:bg-ink-100 absolute top-4 right-4 size-10 rounded-lg hover:translate-y-0" onClick={onClose} aria-label="Close new ticket">
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-5 py-3 sm:px-6">
              <Field label="Subject" htmlFor="support-subject" error={errors.subject?.message}>
                <Input
                  id="support-subject"
                  placeholder="Short summary of the issue"
                  autoFocus
                  className="border-ink-300 bg-card focus-visible:border-primary focus-visible:ring-primary/15 min-h-12 rounded-xl px-3.5"
                  aria-invalid={Boolean(errors.subject)}
                  {...register("subject")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                <Field label="Category" htmlFor="support-category" error={errors.category?.message}>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="support-category" className="border-ink-300 bg-card focus-visible:border-primary focus-visible:ring-primary/15 min-h-12 w-full rounded-xl px-3.5" aria-invalid={Boolean(errors.category)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          align="start"
                          className="border-ink-200 bg-card w-[var(--radix-select-trigger-width)] rounded-xl p-1 shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
                        >
                          {SUPPORT_CATEGORIES.map((category) => (
                            <SelectItem
                              key={category.value}
                              value={category.value}
                              className="text-ink-700 focus:bg-ink-100 focus:text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground rounded-lg px-3 py-2.5 text-sm"
                            >
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field label="Priority" htmlFor="support-priority" error={errors.priority?.message}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="support-priority" className="border-ink-300 bg-card focus-visible:border-primary focus-visible:ring-primary/15 min-h-12 w-full rounded-xl px-3.5 whitespace-nowrap [&>span:first-child]:truncate" aria-invalid={Boolean(errors.priority)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          align="start"
                          className="border-ink-200 bg-card w-[var(--radix-select-trigger-width)] rounded-xl p-1 shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
                        >
                          {SUPPORT_PRIORITIES.map((priority) => (
                            <SelectItem
                              key={priority.value}
                              value={priority.value}
                              className="text-ink-700 focus:bg-ink-100 focus:text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground rounded-lg px-3 py-2.5 text-sm"
                            >
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <Field label="Description" htmlFor="support-description" error={errors.description?.message}>
                <Textarea
                  id="support-description"
                  placeholder="Describe what you expected and what you saw..."
                  className="border-ink-300 bg-card focus-visible:border-primary focus-visible:ring-primary/15 min-h-32 resize-y rounded-xl px-3.5 py-3"
                  aria-invalid={Boolean(errors.description)}
                  {...register("description")}
                />
              </Field>

              <div className="space-y-2">
                <p className="text-ink-700 text-sm font-semibold">
                  Attachments <span className="text-ink-500 font-normal">(optional)</span>
                </p>
                <TicketDropzone files={files} onChange={setFiles} disabled={mutation.isPending} />
              </div>
            </div>
          </ScrollArea>

          <div className="bg-card flex shrink-0 justify-end gap-2 px-5 pt-4 pb-6 sm:px-6">
            <Button type="button" variant="outline" className="border-ink-300 hover:border-ink-400 hover:text-primary min-h-11 px-5 hover:translate-y-0" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11 px-5 shadow-[0_8px_18px_rgba(39,55,80,0.2)] hover:-translate-y-0.5" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner aria-hidden="true" /> : <Send aria-hidden="true" />}
              Submit ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="text-ink-700 text-sm font-semibold">{label}</label>
      {children}
      {error ? <p role="alert" className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
