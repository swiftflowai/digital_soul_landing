import type { Handler } from "@netlify/functions";
import { parseMultipart } from "./_lib/form";
import { getUserFromRequest } from "./_lib/auth";
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

    // Optional auth gate unless expose flag set
    const expose = process.env.SIMLI_EXPOSE_KEY === "true";
    if (!expose) {
      const user = await getUserFromRequest(req);
      if (!user) return { statusCode: 401, body: "Unauthorized" };
    }

    if (!process.env.SIMLI_API_KEY) return { statusCode: 500, body: "Missing SIMLI_API_KEY" };

    const { fields, files } = await parseMultipart(req);
    const faceName = fields["face_name"] || undefined;
    const personaId = fields["persona_id"] || undefined;
    const imageFile = files?.[0];
    if (!imageFile) return { statusCode: 400, body: "image file required" };

    const fd = new FormData();
    fd.append("image", new Blob([imageFile.buffer], { type: imageFile.mime }), imageFile.filename || "image.jpg");
    if (faceName) fd.append("face_name", faceName);

    const url = `${SIMLI_BASE.replace(/\/$/, "")}/generateFaceID`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "api-key": String(process.env.SIMLI_API_KEY) } as any,
      body: fd as any
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { statusCode: r.status, body: t || r.statusText };
    }
    const data = await r.json();
    // Normalize id: some accounts return character_uid/request_id/id initially
    const faceId = data?.face_id || data?.character_uid || data?.request_id || data?.id || data?.data?.face_id || data?.data?.id || null;

    // Best-effort: persist original image path to Supabase for preview
    if (personaId) {
      try {
        const path = `${personaId}/${Date.now()}-${imageFile.filename || "avatar.jpg"}`;
        await (supabaseService as any).storage.from('persona-media').upload(path, imageFile.buffer, { contentType: imageFile.mime, upsert: false });
        // Merge metadata instead of overwrite
        const { data: p } = await supabaseService.from('personas').select('metadata').eq('id', personaId).maybeSingle();
        const nextMeta = { ...(p?.metadata as any || {}), simli_face_image_path: path } as any;
        await supabaseService.from('personas').update({ metadata: nextMeta, updated_at: new Date().toISOString() as any }).eq('id', personaId);
      } catch { /* ignore preview persistence errors */ }
    }

    return { statusCode: 200, body: JSON.stringify({ status: data?.status || "processing", face_id: faceId }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


