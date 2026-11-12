"use client";

import { type ChangeEvent, type KeyboardEvent, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useForm } from "react-hook-form";

import { AssistantContextLabel } from "@/components/commons/assistant/assistant-context-label";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_COUNTER_THRESHOLD, ASSISTANT_MAX_MESSAGE_LENGTH } from "@/constants/assistant";
import { selectAssistantDraftKey } from "@/helpers/assistant-drafts";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { assistantComposerSchema, type AssistantComposerValues } from "@/schemas/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

const MIN_ROWS = 1;
const MAX_ROWS = 5;

export const AssistantComposer = () => {
  const { send, stop, isStreaming, isStopping } = useAssistantChat();
  const draftKey = useAssistantStore(selectAssistantDraftKey);
  const setDraft = useAssistantStore((state) => state.setDraft);
  const form = useForm<AssistantComposerValues>({
    resolver: zodResolver(assistantComposerSchema),
    defaultValues: { message: useAssistantStore.getState().drafts[draftKey] ?? "" },
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({ message: useAssistantStore.getState().drafts[draftKey] ?? "" });
  }, [draftKey, form]);
  const message = form.watch("message");
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, message.split("\n").length));

  const canSend = message.trim().length > 0 && message.length <= ASSISTANT_MAX_MESSAGE_LENGTH;

  const submit = form.handleSubmit((values) => {
    if (isStreaming || values.message.trim().length === 0) return;
    send(values.message);
    setDraft(draftKey, "");
    form.reset({ message: "" });
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col gap-2 border-t p-3">
        <AssistantContextLabel />
        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="relative min-w-0 flex-1">
                <FormControl>
                  <Textarea
                    {...field}
                    rows={rows}
                    placeholder="Ask Podi"
                    className="max-h-40 min-h-0 resize-none"
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                      field.onChange(event);
                      setDraft(draftKey, event.target.value);
                    }}
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
            <Button key="stop" type="button" size="icon" variant="outline" aria-label="Stop" disabled={isStopping} onClick={stop}>
              <Square aria-hidden="true" />
            </Button>
          ) : (
            <Button key="send" type="submit" size="icon" aria-label="Send" disabled={!canSend}>
              <ArrowUp aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};
