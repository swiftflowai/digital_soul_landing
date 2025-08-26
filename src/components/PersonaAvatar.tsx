import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getPersonaById } from '../services/supabaseHelpers';

interface Props {
  personaId?: string | null;
  name?: string | null;
  size?: number; // px
  className?: string;
}

function getInitials(name?: string | null) {
  const n = (name || '').trim();
  if (!n) return 'P';
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'P';
}

export function PersonaAvatar({ personaId, name, size = 40, className }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const initials = useMemo(() => getInitials(name), [name]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!personaId) { setImageUrl(null); return; }
        const p = await getPersonaById(personaId);
        let path = (p as any)?.metadata?.simli_face_image_path as string | undefined;
        if (!path && supabase) {
          // Fallback: find most recent file in persona folder if metadata not set yet
          try {
            const { data: files } = await (supabase as any).storage.from('persona-media').list(personaId, { limit: 1000 });
            const latest = (files || []).filter((f: any) => !f.name.endsWith('/') ).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
            if (latest?.name) path = `${personaId}/${latest.name}`;
          } catch {}
        }
        if (path && supabase) {
          try {
            const { data } = await (supabase as any).storage.from('persona-media').createSignedUrl(path, 60 * 60);
            const url = data?.signedUrl ? `${data.signedUrl}&ts=${Date.now()}` : null;
            setImageUrl(url);
          } catch { setImageUrl(null); }
        } else {
          setImageUrl(null);
        }
      } catch { setImageUrl(null); }
    };
    void load();
    const onUpdated = (e: any) => {
      if (e?.detail?.personaId && e.detail.personaId === personaId) void load();
    };
    window.addEventListener('persona:avatar:updated', onUpdated as any);
    return () => window.removeEventListener('persona:avatar:updated', onUpdated as any);
  }, [personaId]);

  const dim = `${size}px`;

  return (
    <div className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-purple-100 text-purple-700 border ${className || ''}`} style={{ width: dim, height: dim }}>
      {imageUrl ? (
        <img src={imageUrl} alt={name || 'Persona avatar'} className="w-full h-full object-cover" />)
        : (
        <span className="text-xs font-medium">{initials}</span>
      )}
    </div>
  );
}

export default PersonaAvatar;


