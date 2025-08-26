/*
  Heygen API helper utilities.

  Environment variables required:
  - HEYGEN_API_KEY: Secret API key for Heygen
  - HEYGEN_BASE_URL (optional): Defaults to "https://api.heygen.com/v1"
  - HEYGEN_DEFAULT_AVATAR_ID (optional): Fallback avatar_id used when a user has not uploaded an avatar

  Notes:
  - Endpoints and payloads can vary by Heygen plan/version. If your account uses different routes,
    update the constants below accordingly. Responses are normalized by the helpers where possible.
*/

export interface HeygenCreateAvatarResult {
  avatarId: string;
  status: "processing" | "ready" | "failed";
}

export interface HeygenLipsyncResult {
  taskId: string;
  status: "queued" | "processing" | "ready" | "failed";
  videoUrl?: string | null;
}

// Update from v1 to v2
const HEYGEN_BASE = process.env.HEYGEN_BASE_URL || "https://api.heygen.com/v2";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || "";
const HEYGEN_DEFAULT_AVATAR_ID = process.env.HEYGEN_DEFAULT_AVATAR_ID || "";

function getAuthHeaders(): HeadersInit {
  if (!HEYGEN_API_KEY) throw new Error("Missing HEYGEN_API_KEY");
  return { Authorization: `Bearer ${HEYGEN_API_KEY}` } as HeadersInit;
}

export async function heygenCreateAvatarFromUpload(params: {
  file: { buffer: Buffer; mime: string; filename: string };
  name?: string;
}): Promise<HeygenCreateAvatarResult> {
  const fd = new FormData();
  if (params.name) fd.set("name", params.name);
  fd.set(
    "file",
    new Blob([params.file.buffer], { type: params.file.mime }),
    params.file.filename || "avatar-reference"
  );

  const res = await fetch(`${HEYGEN_BASE}/avatars`, {
    method: "POST",
    headers: getAuthHeaders() as any,
    body: fd as any,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Heygen create avatar failed: ${text || res.statusText}`);
  }
  const data = (await res.json()) as any;
  const avatarId = data?.data?.avatar_id || data?.avatar_id || data?.id;
  const status = (data?.data?.status || data?.status || "processing") as
    | "processing"
    | "ready"
    | "failed";
  if (!avatarId) throw new Error("Heygen response missing avatar_id");
  return { avatarId, status };
}

export async function heygenGenerateLipsync(params: {
  avatarId?: string | null;
  inputText?: string | null;
  inputAudioUrl?: string | null;
  videoAspectRatio?: "16:9" | "9:16" | "1:1";
}): Promise<HeygenLipsyncResult> {
  const avatarId = params.avatarId || HEYGEN_DEFAULT_AVATAR_ID;
  if (!avatarId) throw new Error("No avatarId provided and HEYGEN_DEFAULT_AVATAR_ID not set");
  if (!params.inputText && !params.inputAudioUrl) throw new Error("Provide inputText or inputAudioUrl");

  const body: Record<string, unknown> = {
    avatar_id: avatarId,
    input_text: params.inputText || undefined,
    input_audio_url: params.inputAudioUrl || undefined,
    aspect_ratio: params.videoAspectRatio || "16:9",
  };

  const res = await fetch(`${HEYGEN_BASE}/videos`, {
    method: "POST",
    headers: { "content-type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Heygen lipsync failed: ${text || res.statusText}`);
  }
  const data = (await res.json()) as any;
  const taskId = data?.data?.task_id || data?.task_id || data?.id;
  const status = (data?.data?.status || data?.status || "queued") as
    | "queued"
    | "processing"
    | "ready"
    | "failed";
  const videoUrl = data?.data?.video_url || data?.video_url || null;
  if (!taskId && !videoUrl) throw new Error("Heygen response missing task_id/video_url");
  return { taskId: taskId || "", status, videoUrl };
}

export async function heygenGetVideoStatus(taskIdOrVideoId: string): Promise<{
  status: "queued" | "processing" | "ready" | "failed";
  videoUrl?: string | null;
}> {
  // Some Heygen APIs return a task id to poll; others allow fetching by video id.
  // We attempt a generic status endpoint. Update paths to match your account's API.
  const res = await fetch(`${HEYGEN_BASE}/videos/${encodeURIComponent(taskIdOrVideoId)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Heygen status check failed: ${text || res.statusText}`);
  }
  const data = (await res.json()) as any;
  const status = (data?.data?.status || data?.status || "processing") as
    | "queued"
    | "processing"
    | "ready"
    | "failed";
  const videoUrl = data?.data?.video_url || data?.video_url || null;
  return { status, videoUrl };
}


