/*
  GET /.netlify/functions/avatar-status?persona_id=...&task_id=optional

  If task_id is provided, polls Heygen for current status. Otherwise returns last stored status from personas.metadata.
*/
import type { Handler } from "@netlify/functions";
import { supabaseService } from "./_lib/supabase";
import { getUserFromRequest } from "./_lib/auth";
import { heygenGetVideoStatus } from "./_lib/heygen";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { method: "GET", headers: event.headers as any });
    const user = await getUserFromRequest(req);
    if (!user) return { statusCode: 401, body: "Unauthorized" };

    const url = new URL(event.rawUrl);
    const personaId = url.searchParams.get("persona_id");
    const taskId = url.searchParams.get("task_id");
    if (!personaId) return { statusCode: 400, body: "persona_id required" };

    const { data: membership } = await supabaseService
      .from("persona_memberships")
      .select("role")
      .eq("persona_id", personaId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { statusCode: 403, body: "Forbidden" };

    let status: "queued" | "processing" | "ready" | "failed" = "processing";
    let videoUrl: string | null | undefined = null;

    if (taskId) {
      const s = await heygenGetVideoStatus(taskId);
      status = s.status;
      videoUrl = s.videoUrl || null;
    } else {
      // Return the last stored status for the persona
      const { data: persona } = await supabaseService
        .from("personas")
        .select("metadata")
        .eq("id", personaId)
        .maybeSingle();
      status = (persona?.metadata as any)?.heygen_last_status || "processing";
      videoUrl = (persona?.metadata as any)?.heygen_last_video_url || null;
    }

    return { statusCode: 200, body: JSON.stringify({ status, video_url: videoUrl ?? null }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


