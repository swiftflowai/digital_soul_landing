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

    const { persona_id, request_id } = await req.json().catch(() => ({}));
    if (!persona_id || !request_id) return { statusCode: 400, body: "persona_id and request_id required" };

    if (!expose) {
      const { data: membership } = await supabaseService
        .from("persona_memberships")
        .select("role")
        .eq("persona_id", persona_id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!membership) return { statusCode: 403, body: "Forbidden" };
    }

    const candidates = [
      `${SIMLI_BASE.replace(/\/$/, '')}/getRequestStatus`,
      `${SIMLI_BASE.replace(/\/$/, '')}/v1/getRequestStatus`,
      `${SIMLI_BASE.replace(/\/$/, '')}/v2/getRequestStatus`,
    ];
    let data: any = null;
    let lastErr: string | null = null;
    const headerPreference = (process.env.SIMLI_AUTH_STYLE || "api-key").toLowerCase();
    const headerOrder = headerPreference === "bearer" || headerPreference === "x-api-key" || headerPreference === "api-key"
      ? [headerPreference]
      : ["api-key", "bearer", "x-api-key"]; // fallback probe
    for (const url of candidates) {
      for (const headerStyle of headerOrder) {
        try {
          const headers: Record<string, string> = headerStyle === "bearer"
            ? { "content-type": "application/json", Authorization: `Bearer ${process.env.SIMLI_API_KEY!}` }
            : headerStyle === "x-api-key"
              ? { "content-type": "application/json", "x-api-key": String(process.env.SIMLI_API_KEY) }
              : { "content-type": "application/json", "api-key": String(process.env.SIMLI_API_KEY) };
          const r = await fetch(url, {
            method: "POST",
            headers: headers as any,
            body: JSON.stringify({ request_id: request_id || undefined, character_uid: request_id || undefined })
          });
          if (!r.ok) {
            lastErr = `Simli error (${r.status}) on ${url} [${headerStyle}]: ${await r.text().catch(() => r.statusText)}`;
            continue;
          }
          data = await r.json();
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = `Fetch failed on ${url} [${headerStyle}]: ${e?.message || e}`;
        }
      }
      if (data) break;
    }
    if (!data) return { statusCode: 500, body: lastErr || "Unknown Simli error" };

    // Persist face_id as soon as Simli provides it (preview available), not only when final status is "ready"
    if (data?.face_id) {
      const updatedAt = new Date().toISOString();
      const { data: persona } = await supabaseService.from('personas').select('metadata').eq('id', persona_id).maybeSingle();
      const nextMeta = { ...(persona?.metadata as any || {}), simli_face_id: data.face_id } as any;
      await supabaseService
        .from("personas")
        .update({ metadata: nextMeta as any, updated_at: updatedAt })
        .eq("id", persona_id);
    }

    return { statusCode: 200, body: JSON.stringify({ status: data?.status || "processing", face_id: data?.face_id || null }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


