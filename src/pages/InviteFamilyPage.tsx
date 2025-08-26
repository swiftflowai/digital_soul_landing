import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  UserPlus, 
  Users, 
  Check, 
  X,
  Share2,
  Heart,
  Shield,
  Clock,
  User
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuthRole } from '../context/AuthRoleContext';
import { PersonaInvite, PersonaRole } from '../types/persona';
import { createInvite as createInviteLive } from '../services/supabaseHelpers';
import { listInvitesForPersonaIds, listParticipantsForPersonaIds, listMyMemberships, getCurrentUserId, removeParticipantAndMembership } from '../services/supabaseHelpers';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  relationship: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: Date;
  avatar?: string;
}

const InviteFamilyPage = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const defaultPersonaNameFromUrl = searchParams.get('name') || '';
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    relationship: '',
    role: 'VIEWER' as PersonaRole,
    confirmOwnerAuthority: false,
  });
  const { personas, invites, addInvite, currentUserEmail, isSupabaseAuth } = useAuthRole();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [showInvites, setShowInvites] = useState(true);
  const [liveInvites, setLiveInvites] = useState<any[]>([]);
  const [liveParticipants, setLiveParticipants] = useState<any[]>([]);
  const [displayParticipants, setDisplayParticipants] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [canManageMembers, setCanManageMembers] = useState<boolean>(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
    if (currentUserEmail) {
      let isDemo = false;
      if (!isSupabaseAuth) {
        try { isDemo = JSON.parse(localStorage.getItem('userInfo') || 'null')?.isDemo ?? false; } catch {}
      }
      setUserInfo({ email: currentUserEmail, isDemo });
    } else {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        setUserInfo(JSON.parse(storedUserInfo));
      } else {
        navigate('/');
      }
    }
  }, [navigate, currentUserEmail, isSupabaseAuth]);

  // Load invites as the source of truth for family members
  useEffect(() => {
    const load = async () => {
      if (isSupabaseAuth) {
        const pid = selectedPersonaId || personas[0]?.id || '';
        if (!pid) { setLiveInvites([]); return; }
        try {
          const res = await listInvitesForPersonaIds([pid]);
          setLiveInvites(res as any[]);
          const parts = await listParticipantsForPersonaIds([pid]);
          setLiveParticipants(parts as any[]);
          // Merge accepted invites as fallback display participants if participant upsert hasn't happened yet
          const viewerInvites = (res || []).filter((i: any) => String(i.role).toUpperCase() === 'VIEWER' && i.status !== 'REVOKED');
          const byUserOrEmail = new Set(parts.map((p: any) => p.user_id || p.email));
          const invitesAsMembers = viewerInvites
            .filter((i: any) => !byUserOrEmail.has(i.accepted_user_id) && !byUserOrEmail.has(i.email))
            .map((i: any) => ({
              id: `inv_${i.id}`,
              persona_id: i.persona_id,
              user_id: i.accepted_user_id,
              role: i.role,
              name: null,
              email: i.email,
              relationship: null,
              created_at: i.accepted_at || i.created_at
            }));
          setDisplayParticipants([ ...parts, ...invitesAsMembers ]);
          // determine owner/custodian rights for selected persona
          const [uid, myMemberships] = await Promise.all([
            getCurrentUserId(),
            listMyMemberships()
          ]);
          const selected = personas.find(p => p.id === pid) as any;
          const isOwner = !!uid && selected && selected.created_by === uid;
          const mem = myMemberships.find(m => (m as any).persona_id === pid);
          const isCustodian = !!mem && String((mem as any).role).toUpperCase() === 'CUSTODIAN';
          const isOwnerRole = !!mem && String((mem as any).role).toUpperCase() === 'OWNER';
          setCanManageMembers(Boolean(isOwner || isOwnerRole || isCustodian));
        } catch {
          setLiveInvites([]);
          setLiveParticipants([]);
          setDisplayParticipants([]);
          setCanManageMembers(false);
        }
      } else {
        // In demo, derive familyMembers from local invites
        const derived: FamilyMember[] = invites
          .filter(i => i.personaId === (selectedPersonaId || personas[0]?.id))
          .map(i => ({
            id: i.id,
            name: i.name,
            email: i.email,
            relationship: i.relationship,
            status: i.status === 'ACCEPTED' ? 'accepted' : 'pending',
            invitedAt: new Date(i.invitedAt)
          }));
        setFamilyMembers(derived);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseAuth, selectedPersonaId, personas, invites]);

  // Auto-refresh live invites periodically for quick UI updates after acceptance
  useEffect(() => {
    if (!isSupabaseAuth) return;
    const id = setInterval(async () => {
      const pid = selectedPersonaId || personas[0]?.id || '';
      if (!pid) return;
      try {
        const res = await listInvitesForPersonaIds([pid]);
        setLiveInvites(res as any[]);
        const parts = await listParticipantsForPersonaIds([pid]);
        setLiveParticipants(parts as any[]);
        const viewerInvites = (res || []).filter((i: any) => String(i.role).toUpperCase() === 'VIEWER' && i.status !== 'REVOKED');
        const byUserOrEmail = new Set(parts.map((p: any) => p.user_id || p.email));
        const invitesAsMembers = viewerInvites
          .filter((i: any) => !byUserOrEmail.has(i.accepted_user_id) && !byUserOrEmail.has(i.email))
          .map((i: any) => ({
            id: `inv_${i.id}`,
            persona_id: i.persona_id,
            user_id: i.accepted_user_id,
            role: i.role,
            name: null,
            email: i.email,
            relationship: null,
            created_at: i.accepted_at || i.created_at
          }));
        setDisplayParticipants([ ...parts, ...invitesAsMembers ]);
        const [uid, myMemberships] = await Promise.all([
          getCurrentUserId(),
          listMyMemberships()
        ]);
        const selected = personas.find(p => p.id === pid) as any;
        const isOwner = !!uid && selected && selected.created_by === uid;
        const mem = myMemberships.find(m => (m as any).persona_id === pid);
        const isCustodian = !!mem && String((mem as any).role).toUpperCase() === 'CUSTODIAN';
        const isOwnerRole = !!mem && String((mem as any).role).toUpperCase() === 'OWNER';
        setCanManageMembers(Boolean(isOwner || isOwnerRole || isCustodian));
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [isSupabaseAuth, selectedPersonaId, personas]);

  // Initialize selection from URL if provided, then auto-select when personas load
  useEffect(() => {
    const fromUrl = searchParams.get('personaId');
    if (fromUrl && fromUrl !== selectedPersonaId) {
      setSelectedPersonaId(fromUrl);
      return;
    }
    if (!selectedPersonaId && personas && personas.length > 0) {
      setSelectedPersonaId(personas[0].id);
    }
  }, [personas, selectedPersonaId, searchParams]);

  // Load demo family members only in demo mode
  useEffect(() => {
    if (userInfo?.isDemo) {
      setFamilyMembers([
        {
          id: '1',
          name: 'Emily Johnson',
          email: 'emily.johnson@email.com',
          relationship: 'Daughter',
          status: 'accepted',
          invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2',
          name: 'Michael Johnson',
          email: 'michael.johnson@email.com',
          relationship: 'Son',
          status: 'pending',
          invitedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          id: '3',
          name: 'Sophie Johnson',
          email: 'sophie.johnson@email.com',
          relationship: 'Granddaughter',
          status: 'accepted',
          invitedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ]);
    }
  }, [userInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInviteForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const token = Math.random().toString(36).slice(2, 10);
    const personaId = selectedPersonaId || personas[0]?.id || '';
    if (!personaId) {
      setIsLoading(false);
      alert('Please create or select a persona first.');
      navigate('/dashboard');
      return;
    }
    try {
      setSubmitError(null);
      if (isSupabaseAuth) {
        try {
          await createInviteLive({
            persona_id: personaId as any,
            email: inviteForm.email as any,
            role: inviteForm.role as any,
            token: token as any,
            status: 'PENDING' as any
          } as any);
        } catch (e: any) {
          setSubmitError(e?.message || 'Failed to create invite');
          return;
        }
        const res = await listInvitesForPersonaIds([personaId]);
        setLiveInvites(res as any[]);
      } else {
        const newInvite: PersonaInvite = {
          id: `inv_${Date.now()}`,
          personaId,
          email: inviteForm.email,
          name: inviteForm.name,
          relationship: inviteForm.relationship,
          role: inviteForm.role,
          token,
          status: 'PENDING',
          invitedAt: new Date().toISOString(),
        };
        addInvite(newInvite);
        const newMember: FamilyMember = {
          id: newInvite.id,
          name: inviteForm.name,
          email: inviteForm.email,
          relationship: inviteForm.relationship,
          status: 'pending',
          invitedAt: new Date()
        };
        setFamilyMembers(prev => [...prev, newMember]);
      }
      setCopiedEmail(inviteForm.email);
      setTimeout(() => setCopiedEmail(null), 1500);
      setInviteForm({ name: '', email: '', relationship: '', role: 'VIEWER', confirmOwnerAuthority: false });
      setShowInviteForm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (id: string) => {
    setFamilyMembers(prev => prev.filter(member => member.id !== id));
  };

  const handleResendInvite = (email: string) => {
    // Simulate resending invite
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const copyInviteLink = () => {
    let chosenPersonaId = selectedPersonaId || personas[0]?.id || '';
    if (!chosenPersonaId) {
      alert('Please create a persona first. Redirecting to setup.');
      navigate('/dashboard');
      return;
    }
    // Find most recent pending invite for this persona
    const latestForPersona = invites
      .filter(i => i.personaId === chosenPersonaId && i.status === 'PENDING')
      .sort((a, b) => new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime())
      .slice(-1)[0];
    if (!latestForPersona) {
      alert('Please create an invite for this persona first.');
      return;
    }
    const persona = personas.find(p => p.id === chosenPersonaId);
    const params = new URLSearchParams({ invitation: latestForPersona.token, role: String(latestForPersona.role), personaId: chosenPersonaId });
    const resolvedName = persona?.subjectFullName || defaultPersonaNameFromUrl;
    if (resolvedName) params.set('name', resolvedName);
    const basePath = String(latestForPersona.role).toUpperCase() === 'VIEWER' ? '/chat' : '/contributor';
    const inviteLink = `${window.location.origin}${basePath}?${params.toString()}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedEmail('link');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'declined':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'declined':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo className="w-8 h-8" textClassName="text-xl text-gray-900" />
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with simple owner gate hint */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-6 py-3 mb-6">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Family Access</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Invite Family Members
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Share access to your digital soul with your family. They can chat, share memories, and connect.
            </p>
            {userInfo?.isDemo && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Demo mode: Pre-filled with sample family members
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              <button
                onClick={() => setShowInvites(!showInvites)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
              {showInvites ? 'Hide' : 'Show'} Pending Invites
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-3 grid md:grid-cols-3 gap-4 mb-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Persona</label>
                  <select
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Auto-select latest</option>
                    {personas.map(p => (
                      <option key={p.id} value={p.id}>{(p as any).subjectFullName || (p as any).name || 'Unnamed Persona'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowInviteForm(true)}
                className="flex items-center space-x-3 p-4 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <UserPlus className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Invite by Email</p>
                  <p className="text-sm text-gray-600">Send direct invitation</p>
                </div>
              </button>
              
              <button
                onClick={copyInviteLink}
                className="flex items-center space-x-3 p-4 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Share2 className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Copy Invite Link</p>
                  <p className="text-sm text-gray-600">Share via messaging</p>
                </div>
              </button>
              
              <button
                onClick={() => {
                  const chosenPersonaId = selectedPersonaId || personas[0]?.id || '';
                  if (!chosenPersonaId) {
                    alert('Please create a persona first. Redirecting to setup.');
                    navigate('/dashboard');
                    return;
                  }
                  const latestForPersona = invites
                    .filter(i => i.personaId === chosenPersonaId && i.status === 'PENDING')
                    .sort((a, b) => new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime())
                    .slice(-1)[0];
                  if (!latestForPersona) {
                    alert('Please create an invite for this persona first.');
                    return;
                  }
                  const persona = personas.find(p => p.id === chosenPersonaId);
                  const params = new URLSearchParams({ invitation: latestForPersona.token, role: String(latestForPersona.role), personaId: chosenPersonaId });
                  const resolvedName = persona?.subjectFullName || defaultPersonaNameFromUrl;
                  if (resolvedName) params.set('name', resolvedName);
                  navigate(`/contributor?${params.toString()}`);
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center space-x-2"
              >
                <User className="w-5 h-5" />
                <span>Open Latest Invite</span>
              </button>
              
              <div className="flex items-center space-x-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <Shield className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Privacy Controls</p>
                  <p className="text-sm text-gray-600">Manage access levels</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending invites */}
          {showInvites && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Invites</h2>
              <div className="space-y-3">
                {(isSupabaseAuth ? liveInvites.filter((i:any) => i.status === 'PENDING') : invites.filter(i => i.status === 'PENDING')).map((i:any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{isSupabaseAuth ? i.email : `${i.name} (${i.email})`}</div>
                      <div className="text-xs text-gray-600">Role: {String(i.role).toLowerCase()} • Token: {i.token}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 text-sm bg-gray-100 rounded-lg"
                        onClick={() => {
                          const personaIdForLink = isSupabaseAuth ? i.persona_id : i.personaId;
                          const persona = personas.find(p => p.id === personaIdForLink) || personas[0];
                          const params = new URLSearchParams({ invitation: i.token, role: String(i.role), personaId: personaIdForLink });
                          const resolvedName = persona?.subjectFullName || defaultPersonaNameFromUrl;
                          if (resolvedName) params.set('name', resolvedName);
                          const basePath = String(i.role).toUpperCase() === 'VIEWER' ? '/chat' : '/contributor';
                          const link = `${window.location.origin}${basePath}?${params.toString()}`;
                          navigator.clipboard.writeText(link);
                          setCopiedEmail('link');
                          setTimeout(() => setCopiedEmail(null), 1500);
                        }}
                      >Copy Link</button>
                      {!isSupabaseAuth && (
                        <button className="px-3 py-1 text-sm text-red-700 bg-red-50 rounded-lg" onClick={() => {
                          const updated = invites.map(x => x.id === i.id ? { ...x, status: 'REVOKED' } : x);
                          localStorage.setItem('ds_persona_invites', JSON.stringify(updated));
                          window.location.reload();
                        }}>Revoke</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family Members List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Family Members</h2>
              <span className="text-sm text-gray-600">
                {(isSupabaseAuth ? liveParticipants.length : familyMembers.length)} member{(isSupabaseAuth ? liveParticipants.length : familyMembers.length) !== 1 ? 's' : ''}
              </span>
            </div>

            {(isSupabaseAuth ? displayParticipants.length === 0 : familyMembers.length === 0) ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No family members yet</h3>
                <p className="text-gray-600 mb-6">Start by inviting your family to connect with Sarah's digital soul.</p>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                >
                  Invite First Member
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(isSupabaseAuth ? displayParticipants : familyMembers).map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Heart className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{isSupabaseAuth ? (member.name || 'Member') : member.name}</h3>
                        <p className="text-sm text-gray-600">{isSupabaseAuth ? member.email : member.email}</p>
                        <p className="text-xs text-gray-500">{isSupabaseAuth ? (member.role || member.relationship) : member.relationship}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {!isSupabaseAuth && (
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          <span className="capitalize">{member.status}</span>
                        </div>
                      )}
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Invited</p>
                        <p className="text-xs text-gray-700">{isSupabaseAuth ? new Date(member.created_at).toLocaleString() : formatDate(member.invitedAt)}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!isSupabaseAuth && member.status === 'pending' && (
                          <button onClick={() => handleResendInvite(member.email)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Resend invite">
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {isSupabaseAuth && member.role === 'VIEWER' && canManageMembers && (
                          <button
                            onClick={async () => {
                              try {
                                await removeParticipantAndMembership({ personaId: member.persona_id, userId: member.user_id });
                                const parts = await listParticipantsForPersonaIds([member.persona_id]);
                                setLiveParticipants(parts as any[]);
                              } catch (e: any) {
                                alert(e?.message || 'Failed to remove viewer');
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remove viewer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {isSupabaseAuth && member.role === 'VIEWER' && (
                          <button
                            onClick={() => {
                              const params = new URLSearchParams({ personaId: member.persona_id });
                              const link = `${window.location.origin}/chat?${params.toString()}`;
                              navigator.clipboard.writeText(link);
                              setCopiedEmail('link');
                              setTimeout(() => setCopiedEmail(null), 1500);
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            title="Copy Chat Link"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                        {!isSupabaseAuth && (
                          <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Remove member">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="mt-8 bg-blue-50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Privacy & Security</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <ul className="space-y-2">
                <li>• Family members can only access what you allow</li>
                <li>• You control all privacy settings</li>
                <li>• Invitations expire after 7 days</li>
              </ul>
              <ul className="space-y-2">
                <li>• Members can be removed at any time</li>
                <li>• All interactions are private and secure</li>
                <li>• Activity logs are available for review</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

          {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowInviteForm(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Invite Family Member</h2>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {submitError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={inviteForm.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter their full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={inviteForm.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="their.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <select
                    name="relationship"
                    required
                    value={inviteForm.relationship}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="grandchild">Grandchild</option>
                    <option value="cousin">Cousin</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as PersonaRole }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="CONTRIBUTOR">Contributor</option>
                    <option value="OWNER">Owner (Deceased/Legal Transfer)</option>
                  </select>
                </div>

                {inviteForm.role === 'OWNER' && (
                  <div className="col-span-1 md:col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2"><strong>Important:</strong> Transferring ownership is intended for cases such as the owner's death or legal transfer of rights.</p>
                    <label className="flex items-start space-x-3 text-sm text-yellow-900">
                      <input
                        type="checkbox"
                        checked={inviteForm.confirmOwnerAuthority}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, confirmOwnerAuthority: e.target.checked }))}
                        className="mt-1 text-yellow-700 border-yellow-400 focus:ring-yellow-600"
                      />
                      <span>
                        I confirm I have the legal authority to transfer or assign ownership of this persona and understand all data and controls will be transferred upon acceptance.
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (inviteForm.role === 'OWNER' && !inviteForm.confirmOwnerAuthority)}
                    className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      (inviteForm.role === 'OWNER' ? 'Transfer Ownership Invite' : 'Send Invitation')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {copiedEmail && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
            <Check className="w-5 h-5" />
            <span>
              {copiedEmail === 'link' ? 'Invite link copied!' : 'Invitation sent!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteFamilyPage;
