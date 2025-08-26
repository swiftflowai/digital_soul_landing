/*
  POST /.netlify/functions/simli-start-session

  Development-only helper to bootstrap a Simli client session.
  In production, implement a proper token exchange with Simli (do NOT expose API keys).

  Env:
  - SIMLI_API_KEY (required)
  - SIMLI_FACE_ID (optional)
  - SIMLI_EXPOSE_KEY ("true" to return api_key for local testing only)
*/
import type { Handler } from "@netlify/functions";
import { getUserFromRequest } from "./_lib/auth";
import { supabaseService } from "./_lib/supabase";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { method: "POST", headers: event.headers as any, body: event.body });
    const exposeMode = process.env.SIMLI_EXPOSE_KEY === "true";
    // Require auth unless explicitly in expose mode (dev/test)
    if (!exposeMode) {
      const user = await getUserFromRequest(req);
      if (!user) return { statusCode: 401, body: "Unauthorized" };
    }

    const { SIMLI_API_KEY, SIMLI_FACE_ID } = process.env;
    if (!SIMLI_API_KEY) return { statusCode: 500, body: "Missing SIMLI_API_KEY" };

    // For development only: allow returning the API key to the browser
    if (exposeMode) {
      // Prefer persona metadata simli_face_id when provided via query param persona_id
      let effectiveFaceId: string | null = SIMLI_FACE_ID || null;
      try {
        const url = new URL(event.rawUrl);
        const personaId = url.searchParams.get('persona_id');
        if (personaId) {
          const { data: persona } = await supabaseService
            .from('personas')
            .select('metadata')
            .eq('id', personaId)
            .maybeSingle();
          const meta = (persona?.metadata as any) || {};
          if (meta.simli_face_id) effectiveFaceId = String(meta.simli_face_id);
        }
      } catch { /* ignore and fallback */ }
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, api_key: SIMLI_API_KEY, face_id: effectiveFaceId })
      };
    }

    // In production, this endpoint should instead create an ephemeral session/token using Simli server APIs
    // and return that token to the client. Leaving unimplemented to avoid exposing keys.
    return { statusCode: 501, body: "Simli server token exchange not configured. Set SIMLI_EXPOSE_KEY=true for local dev only." };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


