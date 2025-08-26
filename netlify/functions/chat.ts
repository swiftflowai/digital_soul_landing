import type { Handler } from "@netlify/functions";
import OpenAI from "openai";
import { getUserFromRequest } from "./_lib/auth";
import { supabaseService } from "./_lib/supabase";
import { buildSystemPrompt } from "./_lib/prompt";
import { recallMemories } from "./_lib/memory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    // Build a Request so we can read JSON easily
    const req = new Request(new URL(event.rawUrl), {
      method: "POST",
      headers: event.headers as any,
      body: event.isBase64Encoded && event.body ? Buffer.from(event.body, "base64") : (event.body as any)
    });

    // Note: We intentionally avoid using user for memory recall to support demo/anonymous flows
    await getUserFromRequest(req);

    const { personaId, messages } = await req.json() as {
      personaId: string;
      messages: { role: "user" | "assistant" | "system"; content: string }[];
    };
    if (!personaId || !messages?.length) return { statusCode: 400, body: "personaId and messages required" };

    // Fetch persona minimal info (public)
    const { data: persona } = await supabaseService
      .from("personas")
      .select("id, name, description")
      .eq("id", personaId)
      .single();
    if (!persona) return { statusCode: 404, body: "Persona not found" };

    const lastUserMessage = messages.findLast(m => m.role === "user")?.content || "";
    const memories = await recallMemories(personaId, lastUserMessage);
    const system = buildSystemPrompt(persona as any, memories);

    // Simpler Netlify-compatible return: full text JSON (client simulates streaming)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      stream: false,
      messages: [{ role: "system", content: system }, ...messages]
    });
    const text = completion.choices?.[0]?.message?.content || "";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


