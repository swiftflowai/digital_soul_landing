/*
  POST /.netlify/functions/avatar-upload

  Accepts: multipart/form-data with one or more files (video/image) and fields:
    - persona_id: string (required)
    - avatar_name: string (optional)

  Auth: Bearer token from Supabase. User must be a member of the persona.
  Effect: Uploads a file to Heygen to create an avatar, stores heygen_avatar_id and status in personas.metadata.
*/
import type { Handler } from "@netlify/functions";
import { getUserFromRequest } from "./_lib/auth";
import { parseMultipart } from "./_lib/form";
import { heygenCreateAvatarFromUpload } from "./_lib/heygen";
import { supabaseService } from "./_lib/supabase";

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
    const personaId = fields["persona_id"];
    const avatarName = fields["avatar_name"] || "Persona Avatar";
    if (!personaId) return { statusCode: 400, body: "persona_id required" };

    // Authorization: must be a member of this persona
    const { data: membership } = await supabaseService
      .from("persona_memberships")
      .select("role")
      .eq("persona_id", personaId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { statusCode: 403, body: "Forbidden" };

    const file = files[0];
    if (!file) return { statusCode: 400, body: "Upload a file under any field name" };

    const { avatarId, status } = await heygenCreateAvatarFromUpload({
      file: { buffer: file.buffer, mime: file.mime, filename: file.filename },
      name: avatarName,
    });

    // Store Heygen avatar id on persona metadata and mark processing status
    const updatedAt = new Date().toISOString();
    const metadataUpdate = { heygen_avatar_id: avatarId, heygen_avatar_status: status };
    await supabaseService
      .from("personas")
      .update({ metadata: metadataUpdate as any, updated_at: updatedAt })
      .eq("id", personaId);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, heygen_avatar_id: avatarId, status }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


