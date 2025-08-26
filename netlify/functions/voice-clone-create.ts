import type { Handler } from "@netlify/functions";
import { supabaseService } from "./_lib/supabase";
import { getUserFromRequest } from "./_lib/auth";
import { parseMultipart } from "./_lib/form";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), {
      method: "POST",
      headers: event.headers as any,
      body: event.isBase64Encoded && event.body ? Buffer.from(event.body, "base64") : (event.body as any)
    });

    const user = await getUserFromRequest(req);
    if (!user) return { statusCode: 401, body: "Unauthorized" };

    const { fields, files } = await parseMultipart(req);
    const persona_id = fields["persona_id"]; 
    const persona_name = fields["persona_name"] || persona_id;
    if (!persona_id) return { statusCode: 400, body: "persona_id required" };

    const sampleFiles = files.filter(f => f.fieldname === "samples");
    if (sampleFiles.length === 0) return { statusCode: 400, body: "At least one 'samples' file is required" };

    const { data: membership } = await supabaseService
      .from("persona_memberships")
      .select("role")
      .eq("persona_id", persona_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { statusCode: 403, body: "Forbidden" };

    const fd = new FormData();
    fd.append("name", String(persona_name));
    sampleFiles.forEach((f, i) => {
      fd.append("files", new Blob([f.buffer], { type: f.mime }), `sample${i}-${f.filename || "voice.mp3"}`);
    });

    const r = await fetch(`${ELEVEN_BASE}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } as any,
      body: fd as any
    });
    if (!r.ok) return { statusCode: 500, body: `ElevenLabs error: ${await r.text()}` };
    const data = await r.json() as { voice_id: string };

    await supabaseService
      .from("personas")
      .update({ voice_model_url: data.voice_id, updated_at: new Date().toISOString() })
      .eq("id", persona_id);

    return { statusCode: 200, body: JSON.stringify({ ok: true, voice_id: data.voice_id, status: "ready" }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Server error" };
  }
};


