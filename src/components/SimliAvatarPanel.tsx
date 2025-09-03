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
  const [status, setStatus] = useState<string | null>(null);

  // Lazy import client only in browser
  const clientRef = useRef<any>(null);
  // Reuse a single AudioContext for stability across attaches
  const audioCtxRef = useRef<any>(null);
  // Allow cancelling in-flight start attempts
  const startAbortRef = useRef<AbortController | null>(null);
  // Track the current start run to ignore stale completions
  const startRunIdRef = useRef<number>(0);

  async function startSession() {
    setError(null);
    setStatus('Connecting…');
    setIsStarting(true);
    const MAX_ATTEMPTS = 5;
    function backoffMs(attemptIndex: number) {
      const base = 1000 * Math.pow(2, Math.max(0, attemptIndex)); // 1s,2s,4s,8s,16s
      const jitter = base * (0.25 * Math.random());
      return Math.min(15000, Math.round(base + jitter));
    }
    let attempt = 0;
    const myRunId = ++startRunIdRef.current;
    try {
      while (attempt < MAX_ATTEMPTS) {
        try {
          // Exchange token/face id
          const qs = personaId ? `?persona_id=${encodeURIComponent(personaId)}` : '';
          const ac = new AbortController();
          startAbortRef.current = ac;
          const res = await fetch(`/.netlify/functions/simli-start-session${qs}`, {
            method: 'POST',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            signal: ac.signal,
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.warn('Simli start-session failed:', res.status, text);
            // Treat 500/503 as retryable
            const err = new Error(text || `HTTP ${res.status}`) as any;
            (err.retryable = res.status === 500 || res.status === 503);
            throw err;
          }
          const data = await res.json();
          if (!data.api_key) throw new Error('Simli token exchange not configured');

          // Initialize fresh client for each attempt
          const mod = await import('simli-client');
          const { SimliClient } = mod as any;
          try { await clientRef.current?.close?.(); } catch {}
          clientRef.current = new SimliClient();
          if (!videoRef.current || !audioRef.current) throw new Error('Video/Audio elements not ready');
          clientRef.current.Initialize({
            apiKey: data.api_key,
            faceID: data.face_id || '',
            videoRef: videoRef.current,
            audioRef: audioRef.current,
          });
          
          await clientRef.current.start();
          if (myRunId !== startRunIdRef.current) return; // stale
          setIsActive(true);
          setStatus(null);
          try { onActiveChange?.(true); } catch {}
          return;
        } catch (err: any) {
          if (myRunId !== startRunIdRef.current) return; // cancelled or superseded
          attempt += 1;
          if (attempt >= MAX_ATTEMPTS) throw err;
          const delay = backoffMs(attempt - 1);
          const msg = (err?.retryable || /\b(500|503)\b|Internal Server Error|Service Unavailable/i.test(String(err?.message)))
            ? 'Simli temporarily unavailable. Retrying…'
            : 'Retrying Simli connection…';
          setStatus(`${msg} (${attempt + 1}/${MAX_ATTEMPTS})`);
          try { await clientRef.current?.close?.(); } catch {}
          // small floor to avoid thrash
          await new Promise(r => setTimeout(r, Math.max(800, delay)));
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start Simli session');
      setStatus(null);
    } finally {
      setIsStarting(false);
    }
  }

  async function stopSession() {
    setError(null);
    try {
      // cancel any in-flight start
      try { startAbortRef.current?.abort(); } catch {}
      startRunIdRef.current++;
      await clientRef.current?.close?.();
      await fetch('/.netlify/functions/simli-stop-session', { method: 'POST', headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined });
    } catch {}
    setIsActive(false);
    try { onActiveChange?.(false); } catch {}
  }

  useEffect(() => {
    return () => {
      try { clientRef.current?.close?.(); } catch {}
      try { onActiveChange?.(false); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;
    (async () => {
      try { await stopSession(); } catch {}
      try { await startSession(); } catch {}
    })();
  }, [personaId]);

  useImperativeHandle(ref, () => ({
    attachAudioElement: async (audioEl: HTMLAudioElement, playLocalOutput: boolean = false) => {
      try {
        if (!clientRef.current) return;
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx?.state === 'suspended') { try { await ctx.resume(); } catch {} }
        try { (audioEl as any).crossOrigin = (audioEl as any).crossOrigin || 'anonymous'; } catch {}
        const source = ctx.createMediaElementSource(audioEl);
        const tee = ctx.createGain();
        const dest = ctx.createMediaStreamDestination();
        source.connect(tee);
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
      {/* Soft status while starting/retrying; cleared once start() resolves */}
      {status && !isActive && !error && (
        <div className="text-sm text-amber-700 mb-2">{status}</div>
      )}
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="relative aspect-video w-full bg-black rounded overflow-hidden">
        <div className="absolute z-10 left-2 top-2">
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/80 text-gray-800 border border-white/60 shadow-sm">
            Avatar
          </span>
        </div>
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


