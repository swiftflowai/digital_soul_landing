import type { Handler } from "@netlify/functions";
import { getUserFromRequest } from "./_lib/auth";
import { supabaseService } from "./_lib/supabase";

const SIMLI_BASE = process.env.SIMLI_BASE_URL || "https://api.simli.ai";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { method: "POST", headers: event.headers as any, body: event.body });

    const expose = process.env.SIMLI_EXPOSE_KEY === "true";
    const user = expose ? null : await getUserFromRequest(req);
    if (!expose && !user) return { statusCode: 401, body: "Unauthorized" };
    if (!process.env.SIMLI_API_KEY) return { statusCode: 500, body: "Missing SIMLI_API_KEY" };

    const { face_id, persona_id } = await req.json().catch(() => ({}));
    if (!face_id) return { statusCode: 400, body: "face_id required" };

    const url = `${SIMLI_BASE.replace(/\/$/, "")}/getRequestStatus`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "api-key": String(process.env.SIMLI_API_KEY) } as any,
      body: JSON.stringify({ face_id })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { statusCode: r.status, body: t || r.statusText };
    }
    const data = await r.json(); // { status: ..., face_id }
    const normalizedFaceId = data?.face_id || face_id;
    const rawStatus = String(data?.status || '').toLowerCase();
    const normalizedStatus = rawStatus === 'completed' || rawStatus === 'ready' || rawStatus === 'success'
      ? 'success'
      : rawStatus || 'processing';

    // On success, persist to persona metadata if requested
    if (persona_id && normalizedStatus === "success" && normalizedFaceId) {
      try {
        // Merge metadata to avoid wiping existing fields like simli_face_image_path
        const { data: persona } = await supabaseService.from('personas').select('metadata').eq('id', persona_id).maybeSingle();
        const next = { ...(persona?.metadata as any || {}), simli_face_id: normalizedFaceId } as any;
        await supabaseService
          .from("personas")
          .update({ metadata: next, updated_at: new Date().toISOString() })
          .eq("id", persona_id);
      } catch { /* ignore */ }
    }

    return { statusCode: 200, body: JSON.stringify({ status: normalizedStatus, face_id: normalizedFaceId }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


