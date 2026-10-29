"use client";

import { ArrowUp, Square } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_COUNTER_THRESHOLD, ASSISTANT_MAX_MESSAGE_LENGTH } from "@/constants/assistant";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { assistantComposerSchema,type AssistantComposerValues } from "@/schemas/assistant";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

const MIN_ROWS = 1;
const MAX_ROWS = 5;

export const AssistantComposer = () => {
  const { send, stop, isStreaming } = useAssistantChat();
  const form = useForm<AssistantComposerValues>({
    resolver: zodResolver(assistantComposerSchema),
    defaultValues: { message: "" },
    mode: "onChange",
  });
  const message = form.watch("message");
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, message.split("\n").length));

  const canSend = message.trim().length > 0 && message.length <= ASSISTANT_MAX_MESSAGE_LENGTH;

  const submit = form.handleSubmit((values) => {
    if (isStreaming || values.message.trim().length === 0) return;
    send(values.message);
    form.reset();
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="relative min-w-0 flex-1">
              <FormControl>
                <Textarea
                  {...field}
                  rows={rows}
                  placeholder="Ask the assistant"
                  className="max-h-40 min-h-0 resize-none"
                  onKeyDown={handleKeyDown}
                />
              </FormControl>
              {message.length > ASSISTANT_COUNTER_THRESHOLD ? (
                <p
                  className={cn(
                    "pointer-events-none absolute -top-5 right-1 text-xs",
                    message.length > ASSISTANT_MAX_MESSAGE_LENGTH ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {message.length}/{ASSISTANT_MAX_MESSAGE_LENGTH}
                </p>
              ) : null}
            </FormItem>
          )}
        />
        {isStreaming ? (
          <Button key="stop" type="button" size="icon" variant="outline" aria-label="Stop" onClick={stop}>
            <Square aria-hidden="true" />
          </Button>
        ) : (
          <Button key="send" type="submit" size="icon" aria-label="Send" disabled={!canSend}>
            <ArrowUp aria-hidden="true" />
          </Button>
        )}
      </form>
    </Form>
  );
};
