export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function streamChat(
  token: string | null,
  personaId: string,
  messages: ChatMessage[],
  onDelta: (chunk: string) => void,
  onDone?: () => void,
  onError?: (err: any) => void
) {

  const controller = new AbortController();
  const url = "/.netlify/functions/chat"; // Netlify function path

  fetch(url, {
    method: "POST",
    headers: token
      ? { "content-type": "application/json", Authorization: `Bearer ${token}` }
      : { "content-type": "application/json" },
    body: JSON.stringify({ personaId, messages }),
    signal: controller.signal
  })
    .then(async res => {
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { text: string };
      // Simulate streaming by chunking the text
      const content = data.text || "";
      const chunks = content.match(/.{1,20}/g) || [];
      for (const ch of chunks) {
        onDelta(ch);
        await new Promise(r => setTimeout(r, 15));
      }
      onDone?.();
    })
    .catch(err => onError?.(err));

  return () => controller.abort();
}


