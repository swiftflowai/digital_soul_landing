import { useCallback, useRef, useState } from "react";
import { streamChat, type ChatMessage } from "../lib/api/chat";

export function useStreamedChat(token: string | null, personaId: string | null) {
  const [assistantReply, setAssistantReply] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const abortRef = useRef<() => void>();

  const start = useCallback(
    (history: ChatMessage[]) => {
      if (!personaId) return; // token is optional
      setAssistantReply("");
      setIsStreaming(true);
      abortRef.current?.();
      abortRef.current = streamChat(
        token,
        personaId,
        history,
        chunk => setAssistantReply(prev => prev + chunk),
        () => setIsStreaming(false),
        () => setIsStreaming(false)
      );
    },
    [token, personaId]
  );

  const stop = useCallback(() => {
    abortRef.current?.();
    setIsStreaming(false);
  }, []);

  return { assistantReply, isStreaming, start, stop, setAssistantReply };
}


