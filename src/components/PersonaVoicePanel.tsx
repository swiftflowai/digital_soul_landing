import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { createVoiceClone, getCloneStatus, speakText, voiceChat } from "../lib/api/voice";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

interface Props {
  personaId: string;
  personaName?: string;
  authToken: string;
  initialChatId?: string;
}

export default function PersonaVoicePanel({ personaId, personaName, authToken, initialChatId }: Props) {
  const [status, setStatus] = useState<"ready" | "absent" | "loading">("loading");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [assistantText, setAssistantText] = useState<string>("");
  const { recording, start, stop } = useAudioRecorder();
  const [activeChatId, setActiveChatId] = useState<string | undefined>(initialChatId);
  const [clips, setClips] = useState<{ id: string; created_at: string; text: string; playUrl: string; downloadUrl: string }[]>([]);

  async function loadClips(limit: number = 5) {
    try {
      console.log("PersonaVoicePanel: loadClips called with limit", limit);
      // Guard when supabase is not configured in local demo
      if (!supabase) { setClips([]); return; }
      async function loadFromStorage(maxItems: number) {
        try {
          const prefix = `voice-recordings/${personaId}`;
          const { data: files } = await (supabase!.storage as any)
            .from("persona-media")
            .list(prefix, { limit: maxItems, offset: 0, sortBy: { column: "name", order: "desc" }, search: "" });
          const items = Array.isArray(files) ? files.slice(0, maxItems) : [];
          const signedFiles = await Promise.all(items.map(async (f: any) => {
            try {
              const fullPath = `${prefix}/${f.name}`;
              const { data: stream } = await supabase!.storage.from("persona-media").createSignedUrl(fullPath, 60 * 60);
              const { data: dl } = await supabase!.storage.from("persona-media").createSignedUrl(fullPath, 60 * 60, { download: f.name });
              if (!stream?.signedUrl) return null as any;
              return { id: fullPath, created_at: f.created_at || new Date().toISOString(), text: "", playUrl: stream.signedUrl, downloadUrl: dl?.signedUrl || stream.signedUrl };
            } catch { return null as any; }
          }));
          const fallbackClips = signedFiles.filter(Boolean);
          if (fallbackClips.length > 0) setClips(fallbackClips);
        } catch {
          // ignore fallback errors
        }
      }
      // Prefer fetching by the current chat when available
      if (activeChatId) {
        const { data: msgsByChat } = await supabase!
          .from("chat_messages")
          .select("id, created_at, content, media_url, metadata, chat_id")
          .eq("chat_id", activeChatId)
          .not("media_url", "is", null)
          .order("created_at", { ascending: false });
        const voiceMsgsByChat = (msgsByChat || []).filter((m: any) => {
          const meta = typeof m.metadata === "string" ? (() => { try { return JSON.parse(m.metadata as string); } catch { return {}; } })() : (m.metadata as any) || {};
          return m.media_url && (meta?.source === "voice" || String(m.media_url).startsWith(`voice-recordings/${personaId}/`));
        });
        const topByChat = voiceMsgsByChat.slice(0, limit);
        const signedByChat = await Promise.all(topByChat.map(async (m: any) => {
          try {
            const { data: stream } = await supabase!.storage.from("persona-media").createSignedUrl(m.media_url as string, 60 * 60);
            const fileName = (m.media_url as string).split("/").pop() || "clip.webm";
            const { data: dl } = await supabase!.storage.from("persona-media").createSignedUrl(m.media_url as string, 60 * 60, { download: fileName });
            if (!stream?.signedUrl) return null as any;
            return { id: m.id as string, created_at: m.created_at as string, text: m.content as string, playUrl: stream.signedUrl, downloadUrl: dl?.signedUrl || stream.signedUrl };
          } catch { return null as any; }
        }));
        const normalizedByChat = signedByChat.filter(Boolean);
        if (normalizedByChat.length > 0) { setClips(normalizedByChat); return; }
      }

      const { data: chats } = await supabase!
        .from("chats")
        .select("id")
        .eq("persona_id", personaId)
        .order("created_at", { ascending: false });
      const chatIds = (chats || []).map((c: any) => c.id);
      if (chatIds.length === 0) { await loadFromStorage(limit); return; }
      const { data: msgs } = await supabase!
        .from("chat_messages")
        .select("id, created_at, content, media_url, metadata, chat_id")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false });
      const voiceMsgs = (msgs || []).filter((m: any) => {
        const meta = typeof m.metadata === "string" ? (() => { try { return JSON.parse(m.metadata as string); } catch { return {}; } })() : (m.metadata as any) || {};
        return m.media_url && (meta?.source === "voice" || String(m.media_url).startsWith(`voice-recordings/${personaId}/`)); // user voice recordings
      });
      const top = voiceMsgs.slice(0, limit);
      const signed = await Promise.all(top.map(async (m: any) => {
        try {
          const { data: stream } = await supabase!.storage.from("persona-media").createSignedUrl(m.media_url as string, 60 * 60);
          const fileName = (m.media_url as string).split("/").pop() || "clip.webm";
          const { data: dl } = await supabase!.storage.from("persona-media").createSignedUrl(m.media_url as string, 60 * 60, { download: fileName });
          if (!stream?.signedUrl) return null as any;
          return { id: m.id as string, created_at: m.created_at as string, text: m.content as string, playUrl: stream.signedUrl, downloadUrl: dl?.signedUrl || stream.signedUrl };
        } catch { return null as any; }
      }));
      const normalized = signed.filter(Boolean);

      // Fallback: if no clips found via messages, try listing recent storage files
      if (normalized.length === 0) {
        await loadFromStorage(limit);
        return;
      }

      if (normalized.length > 0) setClips(normalized);
      // If nothing found, keep whatever is currently displayed to avoid flicker
    } catch (error) {
      console.log("PersonaVoicePanel: loadClips error", error);
      // On error, preserve any existing clips rather than clearing the list
    }
  }

  async function refresh() {
    setStatus("loading");
    try {
      const s = await getCloneStatus(authToken, personaId);
      setStatus(s.status);
      setVoiceId(s.voice_id);
    } catch {
      setStatus("absent");
      setVoiceId(null);
    }
  }

  useEffect(() => { refresh(); }, [personaId, authToken]);
  useEffect(() => { loadClips(5); }, [personaId, activeChatId]);
  
  // Debug logging
  useEffect(() => {
    console.log("PersonaVoicePanel: status =", status, "recording =", recording);
  }, [status, recording]);

  async function onCreateClone() {
    if (!files.length) return alert("Please select 1-3 audio files.");
    try {
      const res = await createVoiceClone(authToken, personaId, files.slice(0, 3), personaName);
      setVoiceId(res.voice_id);
      setStatus(res.status);
      alert("Voice clone ready.");
    } catch (e: any) {
      alert(e.message || "Failed to create clone");
    }
  }

  async function onSpeak() {
    if (!text.trim()) return;
    try { await speakText(authToken, personaId, text.trim()); } catch (e: any) { alert(e.message || "TTS failed"); }
  }

  async function onRecordToggle() {
    console.log("PersonaVoicePanel: onRecordToggle called, recording:", recording);
    if (!recording) {
      console.log("PersonaVoicePanel: Starting recording...");
      await start();
    } else {
      console.log("PersonaVoicePanel: Stopping recording...");
      const blob = await stop();
      console.log("PersonaVoicePanel: Got blob", { size: blob.size, type: blob.type });
      try {
        console.log("PersonaVoicePanel: Calling voiceChat API...", { personaId, activeChatId });
        const data = await voiceChat(authToken, personaId, blob, activeChatId);
        console.log("PersonaVoicePanel: Got response", data);
        setAssistantText(data.assistant_text);
        if (!activeChatId && data.chat_id) {
          setActiveChatId(data.chat_id);
          setChatId(data.chat_id);
        }
        // Optimistically append the just-uploaded user clip if backend returned it
        if (data.user_media_signed_url || data.user_media_path) {
          setClips(prev => [
            {
              id: data.user_media_path || `${Date.now()}`,
              created_at: new Date().toISOString(),
              text: data.user_text || "",
              playUrl: data.user_media_signed_url || "",
              downloadUrl: data.user_media_signed_url || ""
            },
            ...prev
          ]);
        }
        // Delay refresh slightly to allow DB write to become visible, and avoid replacing with empty
        setTimeout(() => { void loadClips(5); }, 600);
      } catch (e: any) {
        alert(e.message || "Voice chat failed");
      }
    }
  }

  console.log("PersonaVoicePanel: Rendering with sections - Voice Clone, Text to Voice, Voice Chat, Voice Clips");
  
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Voice Clone</h3>
        <p>Status: <b>{status === "loading" ? "Checking..." : status}</b>{voiceId ? ` (id: ${voiceId})` : ""}</p>
        <input type="file" accept="audio/*" multiple onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
        <div><button onClick={onCreateClone} disabled={!files.length}>Create/Update Voice Clone</button></div>
        <small>Upload 1–3 samples.</small>
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Text to Voice</h3>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type something to speak as the persona..." style={{ width: "100%" }} />
        <div>
          <button
            onClick={onSpeak}
            className={
              (status === "ready"
                ? "bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500 "
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 ") +
              "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            }
          >
            <Play className="w-4 h-4 mr-2" />
            {status === "ready" ? "Play in Persona Voice" : "Play (Fallback Voice)"}
          </button>
        </div>
        <small className="block mt-2 text-sm text-gray-500">
          {status === "ready" ? "Using cloned voice." : "No clone yet — using default system voice."}
        </small>
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Voice Chat</h3>
        <div>
          <button
            onClick={() => {
              console.log("Button clicked! Status:", status, "Disabled:", status !== "ready");
              if (status === "ready") {
                onRecordToggle();
              }
            }}
            disabled={status !== "ready"}
            className={
              (status === "ready"
                ? (recording
                    ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 "
                    : "bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500 ")
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 ") +
              "inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            }
          >
            {recording ? "Stop & Send" : "Record"}
          </button>
        </div>
        {assistantText ? <p><b>Persona:</b> {assistantText}</p> : null}
        {chatId ? <small>Chat ID: {chatId}</small> : null}
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>Voice Clips</h3>

        {clips.length === 0 ? (
          <small>No voice clips yet.</small>
        ) : (
          <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
            {clips.map(c => (
              <li key={c.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#555" }}>{new Date(c.created_at).toLocaleString()}</div>
                    {c.text ? <div style={{ fontSize: 13, color: "#222" }}>{c.text}</div> : null}
                  </div>
                  <audio controls src={c.playUrl} style={{ maxWidth: 260 }} />
                  <a href={c.downloadUrl} style={{ fontSize: 12 }} download>
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


