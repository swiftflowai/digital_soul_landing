export interface PersonaInfo {
  id: string;
  name: string | null;
  description: string | null;
}

export function buildSystemPrompt(persona: PersonaInfo, memories: string[]): string {
  const displayName = persona.name || "Digital Soul";
  const desc = (persona.description || "").trim();
  const memoryBullets = memories.map((m, i) => `- ${m}`).join("\n");

  return [
    `You are the digital soul of ${displayName}. Respond in their tone and personality.`,
    desc ? `Background about ${displayName}: ${desc}` : undefined,
    memories.length
      ? `Relevant memories to draw from (do not invent facts beyond these unless obvious):\n${memoryBullets}`
      : `No specific memories recalled for this message; be warm, empathetic, and concise.`,
    `Guidelines: keep responses under 80 words unless asked for detail; be empathetic, human, and clear.`
  ]
    .filter(Boolean)
    .join("\n\n");
}


