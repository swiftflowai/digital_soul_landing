export async function uploadAvatarMedia(token: string, personaId: string, files: File[], avatarName?: string) {
  const fd = new FormData();
  fd.set("persona_id", personaId);
  if (avatarName) fd.set("avatar_name", avatarName);
  files.forEach((f, i) => fd.append(`file_${i}`, f));
  const res = await fetch("/.netlify/functions/avatar-upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; heygen_avatar_id: string; status: string }>;
}

export async function generateLipsyncVideo(params: {
  token: string;
  personaId: string;
  text?: string;
  audioUrl?: string;
  avatarId?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}) {
  const res = await fetch("/.netlify/functions/avatar-generate-lipsync", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${params.token}` },
    body: JSON.stringify({
      persona_id: params.personaId,
      text: params.text || undefined,
      audio_url: params.audioUrl || undefined,
      avatar_id: params.avatarId || undefined,
      aspect_ratio: params.aspectRatio || undefined,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; task_id: string; status: string; video_url: string | null }>;
}

export async function getAvatarTaskStatus(token: string, personaId: string, taskId?: string) {
  const qs = new URLSearchParams({ persona_id: personaId });
  if (taskId) qs.set("task_id", taskId);
  const res = await fetch(`/.netlify/functions/avatar-status?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: "queued" | "processing" | "ready" | "failed"; video_url: string | null }>;
}

// Simli legacy face create
export async function simliCreateFace(token: string, personaId: string, images: File[]) {
  const fd = new FormData();
  fd.set("persona_id", personaId);
  images.forEach((f) => fd.append("images", f));
  const res = await fetch("/.netlify/functions/simli-face-create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  if (res.status === 429) throw new Error("Avatar creation quota reached for your plan");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; request_id: string | null; status: string }>;
}

export async function simliFaceStatus(token: string, personaId: string, requestId: string) {
  const res = await fetch("/.netlify/functions/simli-face-status", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ persona_id: personaId, request_id: requestId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: "queued" | "processing" | "ready" | "failed"; face_id: string | null }>;
}


