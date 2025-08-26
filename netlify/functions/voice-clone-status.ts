import type { Handler } from "@netlify/functions";
import { supabaseService } from "./_lib/supabase";
import { getUserFromRequest } from "./_lib/auth";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { headers: event.headers as any });
    const user = await getUserFromRequest(req);
    if (!user) return { statusCode: 401, body: "Unauthorized" };

    const persona_id = event.queryStringParameters?.persona_id;
    if (!persona_id) return { statusCode: 400, body: "persona_id required" };

    const { data: persona, error } = await supabaseService
      .from("personas")
      .select("voice_model_url")
      .eq("id", persona_id)
      .single();
    if (error || !persona) return { statusCode: 404, body: "Persona not found" };
    const status = persona.voice_model_url ? "ready" : "absent";
    return { statusCode: 200, body: JSON.stringify({ status, voice_id: persona.voice_model_url || null }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Server error" };
  }
};


