import type { Handler } from "@netlify/functions";
import { supabaseService } from "./_lib/supabase";
import { getUserFromRequest } from "./_lib/auth";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { method: "POST", headers: event.headers as any, body: event.body });
    const user = await getUserFromRequest(req);
    if (!user) return { statusCode: 401, body: "Unauthorized" };
    const { persona_id, text } = JSON.parse(event.body || "{}");
    if (!persona_id || !text) return { statusCode: 400, body: "persona_id and text required" };
    const { data: pm } = await supabaseService
      .from("persona_memberships")
      .select("role")
      .eq("persona_id", persona_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!pm) return { statusCode: 403, body: "Forbidden" };
    const { data: persona } = await supabaseService
      .from("personas")
      .select("voice_model_url")
      .eq("id", persona_id)
      .single();
    const fallbackVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const effectiveVoiceId = persona?.voice_model_url || fallbackVoiceId;
    const r = await fetch(`${ELEVEN_BASE}/text-to-speech/${effectiveVoiceId}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, accept: "audio/mpeg", "content-type": "application/json" } as any,
      body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
    });
    if (!r.ok) return { statusCode: 500, body: await r.text() };
    const buf = Buffer.from(await r.arrayBuffer());
    return { statusCode: 200, headers: { "Content-Type": "audio/mpeg", "x-voice-id-used": effectiveVoiceId }, isBase64Encoded: true, body: buf.toString("base64") };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Server error" };
  }
};


