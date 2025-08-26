import { useCallback, useEffect, useRef, useState } from 'react';
import { getPersonaById } from '../services/supabaseHelpers';
import { supabase } from '../utils/supabaseClient';

interface Props {
  personaId?: string | null;
}

interface StatusResp { status: 'processing'|'success'|'failed'|string; face_id: string | null }

export function SimliFaceCreator({ personaId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [faceId, setFaceId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle'|'uploading'|'processing'|'success'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load existing face_id from persona metadata so users can see current status
  useEffect(() => {
    (async () => {
      try {
        if (!personaId) return;
        const p = await getPersonaById(personaId);
        const meta = (p as any)?.metadata || {};
        const existing = meta?.simli_face_id ?? null;
        if (existing) { setFaceId(String(existing)); setStatus('success'); }
        const path = meta?.simli_face_image_path as string | undefined;
        if (path && supabase) {
          try {
            const { data } = await (supabase as any).storage.from('persona-media').createSignedUrl(path, 60 * 60);
            if (data?.signedUrl) setPreviewUrl(data.signedUrl);
          } catch {}
        }
      } catch { /* ignore if not accessible */ }
    })();
  }, [personaId]);

  const startPolling = useCallback((fid: string) => {
    setStatus('processing');
    const start = Date.now();
    const poll = async () => {
      try {
        const r = await fetch('/.netlify/functions/faceid-status', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ face_id: fid, persona_id: personaId || undefined })
        });
        const data = await r.json() as StatusResp;
        if (data.status === 'success') { setStatus('success'); setFaceId(data.face_id || fid); return; }
        if (data.status === 'failed') { setStatus('error'); setError('Avatar creation failed'); return; }
      } catch (e: any) {
        setError(e?.message || 'Status check failed'); setStatus('error'); return;
      }
      // Stop after 4 minutes; then continue server-side if personaId available
      if (Date.now() - start > 240000) {
        if (personaId) {
          try {
            await fetch('/.netlify/functions/simli-face-watch-background', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ persona_id: personaId, request_id: fid })
            });
          } catch {}
        }
        setStatus('error');
        setError('Still processing; continuing in background. You can check again in a few minutes.');
        return;
      }
      timerRef.current = window.setTimeout(poll, 30000);
    };
    void poll();
  }, [personaId]);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const onGenerate = async () => {
    try {
      setError(null);
      if (!file) { setError('Please choose an image'); return; }
      setStatus('uploading');
      const fd = new FormData();
      fd.append('image', file);
      if (personaId) { fd.append('face_name', personaId); fd.append('persona_id', personaId); }
      const r = await fetch('/.netlify/functions/generate-faceid', { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json() as { status: string; face_id: string | null };
      const fid = data.face_id;
      if (!fid) { setStatus('error'); setError('No face_id returned'); return; }
      setFaceId(fid);
      // Refresh preview from Supabase path saved by server
      try {
        if (personaId) {
          const p = await getPersonaById(personaId);
          const path = (p as any)?.metadata?.simli_face_image_path as string | undefined;
          if (path && supabase) {
            const { data: signed } = await (supabase as any).storage.from('persona-media').createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) setPreviewUrl(`${signed.signedUrl}&ts=${Date.now()}`);
          }
        }
      } catch {}
      startPolling(fid);
      // Notify other components to refresh avatar previews
      try { window.dispatchEvent(new CustomEvent('persona:avatar:updated', { detail: { personaId } })); } catch {}
    } catch (e: any) {
      setStatus('error'); setError(e?.message || 'Failed to start avatar creation');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-700 mb-2">Upload a clear, frontal headshot. We’ll create a Simli video avatar for this persona.</p>
      {previewUrl && (
        <div className="mb-3 flex items-center gap-3">
          <img src={previewUrl} alt="Avatar preview" className="w-12 h-12 rounded-full object-cover border" />
          {faceId && <span className="text-xs text-gray-600">face_id: {faceId}</span>}
        </div>
      )}
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onGenerate} disabled={!file || status==='uploading' || status==='processing'} className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50">Generate Video Avatar</button>
        {status === 'idle' && faceId && <span className="text-sm text-gray-700">Current avatar set. face_id: {faceId}</span>}
        {status === 'uploading' && <span className="text-sm text-gray-600">Uploading…</span>}
        {status === 'processing' && <span className="text-sm text-gray-600">Processing… polling every 30s</span>}
        {status === 'success' && <span className="text-sm text-green-700">Ready. face_id: {faceId}</span>}
        {status === 'error' && (
          <>
            <span className="text-sm text-red-700">{error}</span>
            {faceId && <button onClick={() => startPolling(faceId)} className="text-xs px-2 py-1 rounded border">Check now</button>}
          </>
        )}
      </div>
    </div>
  );
}

export default SimliFaceCreator;


