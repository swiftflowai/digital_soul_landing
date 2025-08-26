import type { Handler } from "@netlify/functions";
import { getUserFromRequest } from "./_lib/auth";
import { parseMultipart } from "./_lib/form";
import { supabaseService } from "./_lib/supabase";

const SIMLI_BASE = process.env.SIMLI_BASE_URL || "https://api.simli.ai";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), {
      method: "POST",
      headers: event.headers as any,
      body: event.isBase64Encoded && event.body ? Buffer.from(event.body, "base64") : (event.body as any)
    });

    const expose = process.env.SIMLI_EXPOSE_KEY === "true";
    if (!expose) {
      const user = await getUserFromRequest(req);
      if (!user) return { statusCode: 401, body: "Unauthorized" };
    }

    const { fields, files } = await parseMultipart(req);
    const personaId = fields["persona_id"];
    if (!personaId) return { statusCode: 400, body: "persona_id required" };
    if (!files || files.length === 0) return { statusCode: 400, body: "Upload 3–8 images under any field name" };

    // Gate by membership
    if (!expose) {
      const { data: membership } = await supabaseService
        .from("persona_memberships")
        .select("role")
        .eq("persona_id", personaId)
        .eq("user_id", (await getUserFromRequest(req))!.id)
        .maybeSingle();
      if (!membership) return { statusCode: 403, body: "Forbidden" };
    }

    if (!process.env.SIMLI_API_KEY) return { statusCode: 500, body: "Missing SIMLI_API_KEY" };

    const fd = new FormData();
    // Per current Simli docs, generateFaceID expects a single field named "image"
    const primary = files[0];
    fd.append("image", new Blob([primary.buffer], { type: primary.mime }), primary.filename || "image.jpg");

    const candidates = [
      `${SIMLI_BASE.replace(/\/$/, '')}/generateFaceID`,
      `${SIMLI_BASE.replace(/\/$/, '')}/v1/generateFaceID`,
      `${SIMLI_BASE.replace(/\/$/, '')}/v2/generateFaceID`,
    ];
    let data: any = null;
    let lastErr: string | null = null;
    // Use doc-conformant header: 'api-key'. Allow override via SIMLI_AUTH_STYLE for troubleshooting
    const headerPreference = (process.env.SIMLI_AUTH_STYLE || "api-key").toLowerCase();
    const headerOrder = headerPreference === "bearer" || headerPreference === "x-api-key" || headerPreference === "api-key"
      ? [headerPreference]
      : ["api-key", "bearer", "x-api-key"]; // safe probe order
    for (const base of candidates) {
      const url = `${base}?face_name=${encodeURIComponent(personaId)}`;
      for (const headerStyle of headerOrder) {
        try {
          const headers: Record<string, string> =
            headerStyle === "bearer"
              ? { Authorization: `Bearer ${process.env.SIMLI_API_KEY}` }
              : headerStyle === "x-api-key"
                ? { "x-api-key": String(process.env.SIMLI_API_KEY) }
                : { "api-key": String(process.env.SIMLI_API_KEY) };
          const res = await fetch(url, {
            method: "POST",
            headers: headers as any,
            body: fd as any
          });
          if (res.status === 403 || res.status === 429) {
            return { statusCode: 429, body: "Avatar creation quota reached for your plan" };
          }
          if (!res.ok) {
            lastErr = `Simli error (${res.status}) on ${url} [${headerStyle}]: ${await res.text().catch(() => res.statusText)}`;
            continue;
          }
          data = await res.json();
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = `Fetch failed on ${url} [${headerStyle}]: ${e?.message || e}`;
        }
      }
      if (data) break;
    }
    if (!data) return { statusCode: 500, body: lastErr || "Unknown Simli error" };

    // Normalize possible response shapes by scanning
    function findId(obj: any): string | null {
      if (!obj || typeof obj !== 'object') return null;
      for (const [k, v] of Object.entries(obj)) {
        const key = k.toLowerCase();
        if ((/request.*id|task.*id|job.*id|queue.*id/).test(key) && (typeof v === 'string' || typeof v === 'number')) return String(v);
        if (key === 'id' && (typeof v === 'string' || typeof v === 'number')) return String(v);
        if (v && typeof v === 'object') {
          const inner = findId(v);
          if (inner) return inner;
        }
      }
      return null;
    }
    function findStatus(obj: any): string | null {
      if (!obj || typeof obj !== 'object') return null;
      for (const [k, v] of Object.entries(obj)) {
        if (k.toLowerCase() === 'status' && typeof v === 'string') return v;
        if (v && typeof v === 'object') {
          const inner = findStatus(v);
          if (inner) return inner;
        }
      }
      return null;
    }

    let requestId = findId(data);
    if (!requestId && typeof data?.character_uid === 'string') requestId = data.character_uid;
    const status = findStatus(data) || 'queued';
    const faceId = data?.face_id || data?.data?.face_id || null;

    return { statusCode: 200, body: JSON.stringify({ ok: true, request_id: requestId, status, face_id: faceId, raw: data }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


