import type { Handler } from "@netlify/functions";
import { getUserFromRequest } from "./_lib/auth";
import { supabaseService } from "./_lib/supabase";

const SIMLI_BASE = process.env.SIMLI_BASE_URL || "https://api.simli.ai";

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchSimliStatus(requestId: string) {
  const candidates = [
    `${SIMLI_BASE.replace(/\/$/, '')}/getRequestStatus`,
    `${SIMLI_BASE.replace(/\/$/, '')}/v1/getRequestStatus`,
    `${SIMLI_BASE.replace(/\/$/, '')}/v2/getRequestStatus`,
  ];
  const headerPreference = (process.env.SIMLI_AUTH_STYLE || "api-key").toLowerCase();
  const headerOrder = headerPreference === "bearer" || headerPreference === "x-api-key" || headerPreference === "api-key"
    ? [headerPreference]
    : ["api-key", "bearer", "x-api-key"];

  for (const url of candidates) {
    for (const style of headerOrder) {
      const headers: Record<string, string> = style === "bearer"
        ? { "content-type": "application/json", Authorization: `Bearer ${process.env.SIMLI_API_KEY!}` }
        : style === "x-api-key"
          ? { "content-type": "application/json", "x-api-key": String(process.env.SIMLI_API_KEY) }
          : { "content-type": "application/json", "api-key": String(process.env.SIMLI_API_KEY) };
      try {
        const r = await fetch(url, { method: "POST", headers: headers as any, body: JSON.stringify({ request_id: requestId, character_uid: requestId }) });
        if (!r.ok) continue;
        const data = await r.json();
        return {
          status: (data?.status || data?.data?.status || "processing") as string,
          face_id: data?.face_id || data?.data?.face_id || null,
        };
      } catch { /* continue */ }
    }
  }
  return { status: "processing", face_id: null as string | null };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { method: "POST", headers: event.headers as any, body: event.body });
    const expose = process.env.SIMLI_EXPOSE_KEY === "true";
    const user = expose ? null : await getUserFromRequest(req);
    if (!expose && !user) return { statusCode: 401, body: "Unauthorized" };

    const { persona_id, request_id } = await req.json().catch(() => ({}));
    if (!persona_id || !request_id) return { statusCode: 400, body: "persona_id and request_id required" };

    // Fire-and-forget long poll (background function allows up to ~15 minutes)
    const started = Date.now();
    const deadlineMs = 15 * 60 * 1000; // 15 minutes
    let persistedFaceId: string | null = null;

    while (Date.now() - started < deadlineMs) {
      const { status, face_id } = await fetchSimliStatus(request_id);
      if (face_id && !persistedFaceId) {
        try {
          await supabaseService
            .from("personas")
            .update({ metadata: { simli_face_id: face_id } as any, updated_at: new Date().toISOString() })
            .eq("id", persona_id);
          persistedFaceId = face_id;
        } catch { /* ignore */ }
      }
      const norm = String(status || '').toLowerCase();
      if (norm === "ready" || norm === "success" || norm === "completed") break;
      if (norm === "failed") break;
      await sleep(8000);
    }

    // Background functions return 202 immediately
    return { statusCode: 202, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


