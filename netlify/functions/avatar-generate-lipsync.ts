/*
  POST /.netlify/functions/avatar-generate-lipsync

  Accepts JSON:
    - persona_id: string (required)
    - text: string (optional)
    - audio_url: string (optional)
    - avatar_id: string (optional override). If omitted, uses persona.metadata.heygen_avatar_id or default avatar.
    - aspect_ratio: "16:9" | "9:16" | "1:1" (optional)

  Returns: { ok, task_id?, status, video_url? }
*/
import type { Handler } from "@netlify/functions";
import { supabaseService } from "./_lib/supabase";
import { getUserFromRequest } from "./_lib/auth";
import { heygenGenerateLipsync } from "./_lib/heygen";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), {
      method: "POST",
      headers: event.headers as any,
      body: event.body,
    });

    const user = await getUserFromRequest(req);
    if (!user) return { statusCode: 401, body: "Unauthorized" };

    const body = await req.json().catch(() => ({}));
    const personaId = body?.persona_id as string | undefined;
    const inputText = body?.text as string | undefined;
    const inputAudioUrl = body?.audio_url as string | undefined;
    const avatarIdOverride = body?.avatar_id as string | undefined;
    const aspect = (body?.aspect_ratio as string) || undefined;

    if (!personaId) return { statusCode: 400, body: "persona_id required" };
    if (!inputText && !inputAudioUrl) return { statusCode: 400, body: "Provide text or audio_url" };

    const { data: membership } = await supabaseService
      .from("persona_memberships")
      .select("role")
      .eq("persona_id", personaId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { statusCode: 403, body: "Forbidden" };

    // Read stored avatar id if present
    const { data: persona } = await supabaseService
      .from("personas")
      .select("metadata")
      .eq("id", personaId)
      .maybeSingle();

    const heygenAvatarId: string | undefined = avatarIdOverride || (persona?.metadata as any)?.heygen_avatar_id || undefined;

    const { taskId, status, videoUrl } = await heygenGenerateLipsync({
      avatarId: heygenAvatarId,
      inputText: inputText || null,
      inputAudioUrl: inputAudioUrl || null,
      videoAspectRatio: (aspect === "9:16" || aspect === "1:1") ? (aspect as any) : "16:9",
    });

    const updatedAt = new Date().toISOString();
    const metadataUpdate: Record<string, unknown> = {
      heygen_last_task_id: taskId,
      heygen_last_status: status,
      heygen_last_video_url: videoUrl || null,
    };
    await supabaseService
      .from("personas")
      .update({ metadata: metadataUpdate as any, updated_at: updatedAt })
      .eq("id", personaId);

    return { statusCode: 200, body: JSON.stringify({ ok: true, task_id: taskId, status, video_url: videoUrl ?? null }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


