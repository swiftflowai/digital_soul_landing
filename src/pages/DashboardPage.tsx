import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Users, Settings, Heart, X } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuthRole } from '../context/AuthRoleContext';
import { listMyMemberships, listMyPersonas, getCurrentUserId, deletePersonaAndMemberships, listInvitesForPersonaIds, listActivitiesForOwnerPersonaIds, listPendingContributionsForOwner, approveOrRejectContribution, deleteContribution } from '../services/supabaseHelpers';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { personas, memberships, currentUserEmail, removePersona, isSupabaseAuth } = useAuthRole();
  const [livePersonas, setLivePersonas] = useState<any[]>([]);
  const [liveMemberships, setLiveMemberships] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isSupabaseAuth) {
      (async () => {
        try {
          const [uid, p, ms] = await Promise.all([getCurrentUserId(), listMyPersonas(), listMyMemberships()]);
          setCurrentUserId(uid);
          setLivePersonas(p);
          setLiveMemberships(ms);
        } catch {
          setCurrentUserId(null);
          setLivePersonas([]);
          setLiveMemberships([]);
        }
      })();
    } else {
      setCurrentUserId(null);
    }
  }, [isSupabaseAuth]);

  const myPersonas = useMemo(() => {
    if (!currentUserEmail) return [] as any[];
    if (isSupabaseAuth) {
      const ids = new Set(liveMemberships.map(m => m.persona_id));
      return livePersonas.filter(p => ids.has(p.id) || (!!currentUserId && p.created_by === currentUserId));
    } else {
      const ids = memberships
        .filter(m => m.userEmail === currentUserEmail)
        .map(m => m.personaId);
      return personas.filter(p => ids.includes(p.id));
    }
  }, [currentUserEmail, memberships, personas, isSupabaseAuth, livePersonas, liveMemberships, currentUserId]);

  const [liveInvites, setLiveInvites] = useState<any[]>([]);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const [liveContributions, setLiveContributions] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isSupabaseAuth) return;
    const personaIds = livePersonas.map(p => p.id);
    if (personaIds.length === 0) {
      setLiveInvites([]);
      setLiveActivities([]);
      setLiveContributions([]);
      return;
    }
    const load = async () => {
      try {
        setLoadError(null);
        const [inv, acts, contribs] = await Promise.all([
          listInvitesForPersonaIds(personaIds),
          listActivitiesForOwnerPersonaIds(personaIds),
          listPendingContributionsForOwner(personaIds)
        ]);
        setLiveInvites(inv as any[]);
        setLiveActivities(acts as any[]);
        setLiveContributions(contribs as any[]);
      } catch (e: any) {
        setLiveInvites([]);
        setLiveActivities([]);
        setLiveContributions([]);
        setLoadError(e?.message || 'Failed to load data');
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [isSupabaseAuth, livePersonas, liveMemberships, currentUserId]);

  const activities = useMemo(() => {
    type Activity = { at: number; title: string; detail?: string };
    const items: Activity[] = [];
    if (isSupabaseAuth) {
      for (const p of livePersonas) {
        const createdAt = new Date((p.created_at || p.createdAt || Date.now())).getTime();
        items.push({ at: createdAt, title: `Persona created`, detail: p.name || 'Unnamed persona' });
      }
      for (const inv of liveInvites) {
        const invitedAt = new Date(inv.invited_at || inv.invitedAt || Date.now()).getTime();
        if (inv.status === 'ACCEPTED') {
          items.push({ at: invitedAt, title: `Invite accepted`, detail: inv.email });
        } else if (inv.status === 'PENDING') {
          items.push({ at: invitedAt, title: `Invite sent`, detail: inv.email });
        }
        // Placeholder for contributions once stored in DB
      }
      for (const a of liveActivities) {
        const at = new Date(a.created_at || Date.now()).getTime();
        if (a.activity_type === 'CONTRIBUTION') {
          items.push({ at, title: `New contribution`, detail: a.actor_email || 'Contributor' });
        }
      }
    } else {
      // Demo: do not show activities per request
    }
    return items.sort((a, b) => b.at - a.at).slice(0, 10);
  }, [isSupabaseAuth, livePersonas, liveInvites, liveActivities]);

  const roleFor = (personaId: string) => {
    if (isSupabaseAuth) {
      const persona = livePersonas.find(x => x.id === personaId);
      if (persona && currentUserId && persona.created_by === currentUserId) return 'OWNER';
      const m = liveMemberships.find(x => x.persona_id === personaId);
      return (m?.role as any) ?? 'VIEWER';
    }
    const m = memberships.find(x => x.personaId === personaId && x.userEmail === currentUserEmail);
    return m?.role ?? 'VIEWER';
  };

  const handleDeletePersona = async (p: any) => {
    const displayName = isSupabaseAuth ? (p.name || 'this persona') : p.subjectFullName
    const confirmed = confirm(`Delete persona "${displayName}"? All data related to this persona will be permanently deleted.`)
    if (!confirmed) return
    try {
      if (isSupabaseAuth) {
        await deletePersonaAndMemberships(p.id)
        setLivePersonas(prev => prev.filter(x => x.id !== p.id))
        setLiveMemberships(prev => prev.filter(x => x.persona_id !== p.id))
      } else {
        removePersona(p.id)
      }
    } catch (e: any) {
      alert(`Failed to delete persona: ${e?.message || 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo className="w-8 h-8" textClassName="text-xl text-gray-900" />
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-green-100 rounded-full px-6 py-3 mb-6">
              <Heart className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Welcome back</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Your Personas</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create, share, and manage digital souls you own or contribute to.
            </p>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Create new persona card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Heart className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create a Persona</h3>
                  <p className="text-gray-600">Start a new digital soul</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                For yourself or for a loved one. Capture memories, voice, and stories.
              </p>
              <button 
                onClick={() => navigate('/persona-setup')}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Create Persona
              </button>
            </div>

            {myPersonas.map(p => (
              <div key={p.id} className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                {roleFor(p.id) === 'OWNER' && (
              <button 
                    aria-label="Delete persona"
                    title="Delete persona"
                    onClick={() => handleDeletePersona(p)}
                    className="absolute top-3 right-3 p-2 rounded-full text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
              </button>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{isSupabaseAuth ? (p.name || 'Unnamed') : p.subjectFullName}</h3>
                    <p className="text-sm text-gray-500">Created {new Date((p.createdAt || p.created_at)).toLocaleDateString()}</p>
            </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">my role: {roleFor(p.id).toLowerCase()}</span>
                </div>
                <p className="text-sm text-gray-600 mb-6">Privacy: {(isSupabaseAuth ? (p.privacy || 'PRIVATE') : p.privacy).toLowerCase()}</p>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => {
                    const nm = isSupabaseAuth ? (p.name || 'Chat') : p.subjectFullName
                    navigate(`/chat?personaId=${encodeURIComponent(p.id)}&name=${encodeURIComponent(nm)}`)
                  }} className="flex items-center justify-center space-x-2 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  <button onClick={() => {
                    const nm = isSupabaseAuth ? (p.name || 'Persona') : p.subjectFullName
                    navigate(`/invite-family?personaId=${encodeURIComponent(p.id)}&name=${encodeURIComponent(nm)}`)
                  }} className="flex items-center justify-center space-x-2 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                    <Users className="w-4 h-4" />
                    <span>Invite</span>
                  </button>
                  <button onClick={() => navigate(`/settings?personaId=${encodeURIComponent(p.id)}&name=${encodeURIComponent(isSupabaseAuth ? (p.name || 'Persona') : p.subjectFullName)}`)} className="flex items-center justify-center space-x-2 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-600">No recent activity yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activities.map((a, idx) => (
                  <li key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-gray-900 font-medium">{a.title}</div>
                      {a.detail && <div className="text-gray-600 text-sm">{a.detail}</div>}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(a.at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending Contributions (Owner Approval) */}
          {isSupabaseAuth && (
            <div className="mt-6 bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Contributions</h2>
              {loadError && (
                <div className="mb-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                  {loadError}
                </div>
              )}
              {liveContributions.length === 0 ? (
                <p className="text-sm text-gray-600">No pending contributions.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {liveContributions.map((c: any) => {
                    const info = (c.content?.personalInfo) || {};
                    const memories = c.content?.memories || {};
                    const storiesCount = (memories.stories?.length) || 0;
                    const photosCount = (memories.photos?.length) || 0;
                    const videosCount = (memories.videos?.length) || 0;
                    const voicesCount = (memories.voiceRecordings?.length) || 0;
                    return (
                      <li key={c.id} className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-gray-900 font-medium">{c.submitted_email || info.email || 'Contributor'}</div>
                            <div className="text-gray-600 text-sm">{new Date(c.created_at).toLocaleString()}</div>
                            <div className="text-gray-600 text-sm mt-1">
                              {info.name ? `Name: ${info.name} • ` : ''}
                              {info.relationship ? `Relationship: ${info.relationship}` : ''}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {`Stories: ${storiesCount} • Photos: ${photosCount} • Videos: ${videosCount} • Voice: ${voicesCount}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                              className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-sm hover:bg-blue-200"
                            >{expanded[c.id] ? 'Hide details' : 'Review details'}</button>
                            <button
                              onClick={async () => {
                                setIsApproving(c.id);
                                try {
                                  await approveOrRejectContribution({ id: c.id, status: 'APPROVED' });
                                  setLiveContributions(prev => prev.filter(x => x.id !== c.id));
                                } finally {
                                  setIsApproving(null);
                                }
                              }}
                              disabled={isApproving === c.id}
                              className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                            >Approve</button>
                            <button
                              onClick={async () => {
                                setIsApproving(c.id);
                                try {
                                  await approveOrRejectContribution({ id: c.id, status: 'REJECTED' });
                                  setLiveContributions(prev => prev.filter(x => x.id !== c.id));
                                } finally {
                                  setIsApproving(null);
                                }
                              }}
                              disabled={isApproving === c.id}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                            >Reject</button>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this submission permanently?')) return;
                                setIsApproving(c.id);
                                try {
                                  await deleteContribution({ id: c.id });
                                  setLiveContributions(prev => prev.filter(x => x.id !== c.id));
                                } finally {
                                  setIsApproving(null);
                                }
                              }}
                              disabled={isApproving === c.id}
                              className="px-3 py-1 rounded-lg bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 disabled:opacity-50"
                            >Delete</button>
                          </div>
                        </div>

                        {expanded[c.id] && (
                          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                            {/* Personal Info */}
                            <div className="mb-4">
                              <div className="text-sm font-semibold text-gray-900 mb-1">Personal Info</div>
                              <div className="text-sm text-gray-700">
                                {info.name && <div>Name: {info.name}</div>}
                                {info.relationship && <div>Relationship: {info.relationship}</div>}
                                {(c.submitted_email || info.email) && <div>Email: {c.submitted_email || info.email}</div>}
                              </div>
                            </div>
                            {/* Stories */}
                            {Array.isArray(memories.stories) && memories.stories.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-semibold text-gray-900 mb-2">Stories</div>
                                <div className="space-y-2">
                                  {memories.stories.map((s: any, i: number) => (
                                    <div key={i} className="p-3 bg-white rounded border border-gray-200">
                                      <div className="font-medium text-gray-900">{s.title || 'Untitled'}</div>
                                      {s.text && <div className="text-sm text-gray-700 whitespace-pre-line mt-1">{s.text}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Photos */}
                            {Array.isArray(memories.photos) && memories.photos.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-semibold text-gray-900 mb-2">Photos</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {memories.photos.map((p: any, i: number) => (
                                    <div key={i} className="p-3 bg-white rounded border border-gray-200">
                                      {p.signedUrl || p.url ? (
                                        <img src={p.signedUrl || p.url} alt={p.title || 'Photo'} className="w-full h-40 object-cover rounded mb-2" />
                                      ) : (
                                        <div className="text-xs text-gray-500 mb-1">{p.file?.name || p.title || 'Photo'}</div>
                                      )}
                                      <div className="text-sm text-gray-700">{p.title || 'Untitled'}</div>
                                      {p.description && <div className="text-xs text-gray-600">{p.description}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Videos */}
                            {Array.isArray(memories.videos) && memories.videos.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-semibold text-gray-900 mb-2">Videos</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {memories.videos.map((v: any, i: number) => (
                                    <div key={i} className="p-3 bg-white rounded border border-gray-200">
                                      {v.signedUrl || v.url ? (
                                        <video src={v.signedUrl || v.url} controls className="w-full h-40 rounded mb-2" />
                                      ) : (
                                        <div className="text-xs text-gray-500 mb-1">{v.file?.name || v.title || 'Video'}</div>
                                      )}
                                      <div className="text-sm text-gray-700">{v.title || 'Untitled'}</div>
                                      {v.description && <div className="text-xs text-gray-600">{v.description}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Voice Recordings */}
                            {Array.isArray(memories.voiceRecordings) && memories.voiceRecordings.length > 0 && (
                              <div className="mb-2">
                                <div className="text-sm font-semibold text-gray-900 mb-2">Voice Clips</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {memories.voiceRecordings.map((a: any, i: number) => (
                                    <div key={i} className="p-3 bg-white rounded border border-gray-200">
                                      {a.signedUrl || a.url ? (
                                        <audio src={a.signedUrl || a.url} controls className="w-full mb-2" />
                                      ) : (
                                        <div className="text-xs text-gray-500 mb-1">{a.file?.name || a.title || 'Audio clip'}</div>
                                      )}
                                      <div className="text-sm text-gray-700">{a.title || 'Untitled'}</div>
                                      {a.description && <div className="text-xs text-gray-600">{a.description}</div>}
                                    </div>
                                  ))}
              </div>
                </div>
                            )}
              </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
