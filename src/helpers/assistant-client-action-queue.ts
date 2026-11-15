import { setAssistantClientActionState } from "@/api/assistant";
import { getErrorMessage } from "@/helpers/error-message";
import { Log } from "@/helpers/log";
import { useAssistantStore } from "@/stores/assistant";

export const flushQueuedClientActionStates = () => {
  const { queuedClientActionStates, messages, setClientActionState, dropQueuedClientActionStates } = useAssistantStore.getState();
  Object.entries(queuedClientActionStates).forEach(([messageId, states]) => {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message || message.isStreaming) return;
    dropQueuedClientActionStates(messageId);
    const knownActionIds = new Set(message.clientActions.map((action) => action.id));
    Object.entries(states)
      .filter(([actionId]) => knownActionIds.has(actionId))
      .forEach(([actionId, state]) => {
        setClientActionState(messageId, actionId, state);
        setAssistantClientActionState({ messageId, actionId, state }).catch((error: unknown) => {
          Log.warn({ prefix: "assistant/client-action", message: getErrorMessage(error) });
        });
      });
  });
};
