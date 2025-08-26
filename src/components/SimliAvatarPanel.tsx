import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface Props {
  authToken: string | null;
  personaId?: string | null;
  onActiveChange?: (active: boolean) => void;
  modeToggle?: React.ReactNode;
}

export interface SimliAvatarHandle {
  attachAudioElement(audioEl: HTMLAudioElement, playLocalOutput?: boolean): Promise<void>;
}

const SimliAvatarPanel = forwardRef<SimliAvatarHandle, Props>(({ authToken, personaId, onActiveChange, modeToggle }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy import client only in browser
  const clientRef = useRef<any>(null);
  // Reuse a single AudioContext for stability across attaches
  const audioCtxRef = useRef<any>(null);

  async function startSession() {
    setError(null);
    setIsStarting(true);
    try {
      // Request dev session params (prefer persona-specific face when provided)
      const qs = personaId ? `?persona_id=${encodeURIComponent(personaId)}` : '';
      const res = await fetch(`/.netlify/functions/simli-start-session${qs}`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.api_key) throw new Error('Simli token exchange not configured');

      const mod = await import('simli-client');
      const { SimliClient } = mod as any;
      clientRef.current = new SimliClient();
      // Ensure refs are resolved to DOM elements
      if (!videoRef.current || !audioRef.current) throw new Error('Video/Audio elements not ready');
      // Initialize (capital I) per simli-client API
      clientRef.current.Initialize({
        apiKey: data.api_key,
        faceID: data.face_id || '',
        videoRef: videoRef.current,
        audioRef: audioRef.current,
      });

      await clientRef.current.start();
      setIsActive(true);
      try { onActiveChange?.(true); } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to start Simli session');
    } finally {
      setIsStarting(false);
    }
  }

  async function stopSession() {
    setError(null);
    try {
      // Close (not stop) per simli-client API
      await clientRef.current?.close?.();
      await fetch('/.netlify/functions/simli-stop-session', { method: 'POST', headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined });
    } catch {}
    setIsActive(false);
    try { onActiveChange?.(false); } catch {}
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { clientRef.current?.close?.(); } catch {}
      try { onActiveChange?.(false); } catch {}
    };
  }, []);

  // Restart when persona changes to pick the correct face
  useEffect(() => {
    if (!isActive) return;
    (async () => {
      try { await stopSession(); } catch {}
      try { await startSession(); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  // Expose attach method for lip-syncing arbitrary audio
  useImperativeHandle(ref, () => ({
    attachAudioElement: async (audioEl: HTMLAudioElement, playLocalOutput: boolean = false) => {
      try {
        if (!clientRef.current) return;
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx?.state === 'suspended') { try { await ctx.resume(); } catch {} }
        // Ensure media element can be used as WebAudio source reliably
        try { (audioEl as any).crossOrigin = (audioEl as any).crossOrigin || 'anonymous'; } catch {}
        const source = ctx.createMediaElementSource(audioEl);
        const tee = ctx.createGain();
        const dest = ctx.createMediaStreamDestination();
        source.connect(tee);
        // Only route to WebAudio speakers when explicitly requested.
        // Default is Simli-only + HTMLAudioElement normal playback to avoid doubling.
        if (playLocalOutput) tee.connect(ctx.destination);
        tee.connect(dest);
        const track = dest.stream.getAudioTracks()[0];
        if (track) clientRef.current.listenToMediastreamTrack(track);
      } catch (e: any) {
        console.warn('Simli attachAudioElement failed:', e?.message || e);
      }
    }
  }), []);

  return (
    <div className="w-full relative">
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="relative aspect-video w-full bg-black rounded overflow-hidden">
        {/* Label top-left */}
        <div className="absolute z-10 left-2 top-2">
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/80 text-gray-800 border border-white/60 shadow-sm">
            Avatar
          </span>
        </div>
        {/* Overlay controls in top-right */}
        <div className="absolute z-10 right-2 top-2 flex items-center gap-2" data-no-drag>
          {modeToggle}
          {!isActive ? (
            <button disabled={isStarting} onClick={startSession} className="px-2.5 py-1.5 rounded-md bg-purple-600 text-white text-xs disabled:opacity-50">{isStarting ? 'Starting…' : 'Start'}</button>
          ) : (
            <button onClick={stopSession} className="px-2.5 py-1.5 rounded-md bg-gray-200 text-gray-800 text-xs">Stop</button>
          )}
        </div>
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
      </div>
      <audio ref={audioRef} autoPlay muted />
    </div>
  );
});

export default SimliAvatarPanel;


