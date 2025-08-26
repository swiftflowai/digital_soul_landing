import type { Handler } from "@netlify/functions";
import { supabaseService } from "./_lib/supabase";

// In-memory rate limiter (per cold start). Best-effort protection for public endpoint.
type RateStat = { count: number; resetAt: number };
const RATE_WINDOW_MS = 60 * 1000; // 1 min window
const RATE_MAX_REQ = 3; // max 3 requests per window
const rateMap: Record<string, RateStat> = Object.create(null);

function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const xff = (headers["x-forwarded-for"] || headers["X-Forwarded-For"]) as string | undefined;
  if (xff && typeof xff === "string") return xff.split(",")[0]?.trim() || "unknown";
  const nf = (headers["x-nf-client-connection-ip"] || headers["X-NF-Client-Connection-IP"]) as string | undefined;
  if (nf) return nf;
  return "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const stat = rateMap[key];
  if (!stat || now > stat.resetAt) {
    rateMap[key] = { count: 1, resetAt: now + RATE_WINDOW_MS };
    return false;
  }
  if (stat.count >= RATE_MAX_REQ) return true;
  stat.count += 1;
  return false;
}

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const ip = getClientIp(event.headers as any);
    const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body as any);
    const invitation = (body?.invitation || body?.invite || "").toString();
    const persona_id = (body?.persona_id || body?.personaId || "").toString();
    const textRaw = (body?.text || "").toString();

    if (!invitation || !persona_id || !textRaw) {
      return { statusCode: 400, body: "invitation, persona_id and text are required" };
    }

    // Strict message constraints
    const text = textRaw.slice(0, 240); // hard cap
    const rateKey = `${ip}:${invitation}`;
    if (isRateLimited(rateKey)) {
      return { statusCode: 429, body: "Rate limit exceeded. Please try again shortly." };
    }

    // Verify invite token belongs to the persona and is a VIEWER role, not revoked/expired
    const { data: inv, error: invErr } = await supabaseService
      .from("persona_invites")
      .select("persona_id, role, status")
      .eq("token", invitation)
      .maybeSingle();
    if (invErr || !inv) return { statusCode: 403, body: "Invalid invite" };
    const status = (inv as any).status?.toString().toUpperCase?.() || "";
    const role = (inv as any).role?.toString().toUpperCase?.() || "";
    if ((inv as any).persona_id !== persona_id) return { statusCode: 403, body: "Invite does not match persona" };
    if (role !== "VIEWER") return { statusCode: 403, body: "Only viewer invites are allowed" };
    if (["REVOKED", "EXPIRED"].includes(status)) return { statusCode: 403, body: "Invite is not active" };

    // Resolve voice model for persona
    const { data: persona } = await supabaseService
      .from("personas")
      .select("voice_model_url")
      .eq("id", persona_id)
      .maybeSingle();
    const fallbackVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const effectiveVoiceId = (persona as any)?.voice_model_url || fallbackVoiceId;

    // Call ElevenLabs TTS
    const r = await fetch(`${ELEVEN_BASE}/text-to-speech/${effectiveVoiceId}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, accept: "audio/mpeg", "content-type": "application/json" } as any,
      body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", optimize_streaming_latency: 2 })
    });
    if (!r.ok) return { statusCode: 500, body: await r.text() };
    const buf = Buffer.from(await r.arrayBuffer());
    return { statusCode: 200, headers: { "Content-Type": "audio/mpeg", "x-voice-id-used": effectiveVoiceId }, isBase64Encoded: true, body: buf.toString("base64") };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};

export default handler;


