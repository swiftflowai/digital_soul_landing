import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  User, 
  Mic, 
  Upload,
  X,
  Check,
  Star,
  Users,
  FileText,
  Send
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuthRole } from '../context/AuthRoleContext';
import { supabase } from '../utils/supabaseClient';
import { getPersonaById, logPersonaContribution, submitPersonaContribution, acceptInviteAndCreateMembership, uploadPersonaMedia } from '../services/supabaseHelpers';
import { readInvites, writeInvites } from '../utils/localStore';

interface ContributionData {
  personalInfo: {
    name: string;
    relationship: string;
    email: string;
  };
  memories: {
    stories: { title: string; text: string }[];
    photos: { file: File; title: string; description: string; date?: string; location?: string }[];
    videos: { file: File; title: string; description: string; date?: string; location?: string }[];
    voiceRecordings: { file: File; title: string; description: string; date?: string }[];
  };
  personality: {
    traits: string[];
    interests: string[];
    values: string[];
  };
  relationships: {
    familyMembers: string[];
    friends: string[];
    significantEvents: string[];
  };
}

const ContributorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // kept for potential future gating but unused in anon flow
  // const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [inviteStatus, setInviteStatus] = useState<'PENDING' | 'INVALID' | 'ACCEPTED'>('PENDING');
  
  const [contributionData, setContributionData] = useState<ContributionData>({
    personalInfo: {
      name: '',
      relationship: '',
      email: ''
    },
    memories: {
      stories: [],
      photos: [],
      videos: [],
      voiceRecordings: []
    },
    personality: {
      traits: [],
      interests: [],
      values: []
    },
    relationships: {
      familyMembers: [],
      friends: [],
      significantEvents: []
    }
  });
  const [storyTitle, setStoryTitle] = useState<string>('');
  const [storyText, setStoryText] = useState<string>('');
  const photoInputId = useMemo(() => `photo-input-${Math.random().toString(36).slice(2, 8)}`, []);
  const videoInputId = useMemo(() => `video-input-${Math.random().toString(36).slice(2, 8)}`, []);
  const audioInputId = useMemo(() => `audio-input-${Math.random().toString(36).slice(2, 8)}`, []);

  // Get invitation data from URL params
  const invitationToken = searchParams.get('invitation');
  const { setMembership, currentUserEmail, personas } = useAuthRole();
  const [personaName, setPersonaName] = useState<string>(searchParams.get('name') || 'Digital Soul');
  const personaIdParam = searchParams.get('personaId') || '';
  const roleUpper = (searchParams.get('role') || '').toUpperCase();
  const isViewerInvite = roleUpper === 'VIEWER';

  useEffect(() => {
    // Derive persona name if not provided in URL
    const urlName = searchParams.get('name');
    if (urlName) {
      setPersonaName(urlName);
      return;
    }
    const token = searchParams.get('invitation') || '';
    let resolvedName: string | null = null;
    if (token) {
      const invList = readInvites();
      const inv = invList.find(i => i.token === token);
      const pid = inv?.personaId || personaIdParam;
      if (pid) {
        const p = personas.find(pp => (pp as any).id === pid);
        if (p) {
          resolvedName = (p as any).subjectFullName || (p as any).name || null;
        }
        // If not found in local context and supabase is configured, fetch live persona
        if (!resolvedName && supabase) {
          getPersonaById(pid).then(lp => {
            const liveName = (lp as any).name || null;
            if (liveName) setPersonaName(liveName);
          }).catch(() => {});
        }
      }
    }
    if (!resolvedName && personaIdParam) {
      const p = personas.find(pp => (pp as any).id === personaIdParam);
      if (p) {
        resolvedName = (p as any).subjectFullName || (p as any).name || null;
      }
      if (!resolvedName && supabase) {
        getPersonaById(personaIdParam).then(lp => {
          const liveName = (lp as any).name || null;
          if (liveName) setPersonaName(liveName);
        }).catch(() => {});
      }
    }
    if (resolvedName) setPersonaName(resolvedName);
  }, [searchParams, personas]);

  // Always try to refine the name from DB when personaId is provided
  useEffect(() => {
    if (!personaIdParam || !supabase) return;
    getPersonaById(personaIdParam)
      .then(lp => {
        const liveName = (lp as any).name || null;
        if (liveName) setPersonaName(liveName);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaIdParam]);

  // Run once on mount to position under fixed navbar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Track auth state
  // Auth tracking removed to allow anonymous invite-based submissions

  useEffect(() => {
    const roleParam = (searchParams.get('role') || '').toUpperCase();
    const personaIdParam = searchParams.get('personaId') || '';
    if (!invitationToken) {
      setInviteStatus('INVALID');
      return;
    }
    const list = readInvites();
    const inv = list.find(i => i.token === invitationToken);
    // If found but not pending -> invalid
    if (inv && inv.status !== 'PENDING') {
      setInviteStatus('INVALID');
      return;
    }
    // If not found, but we have fallback params (dev): accept using URL params
    const targetPersonaId = inv?.personaId || personaIdParam;
    const targetRole = (inv?.role || roleParam || 'VIEWER') as any;
    if (!inv && !targetPersonaId) {
      setInviteStatus('INVALID');
      return;
    }
    // Accept membership
    setTimeout(() => {
      if (!currentUserEmail || !targetPersonaId) return;
      acceptInviteAndCreateMembership({ token: invitationToken }).catch(() => {});
      setMembership(targetPersonaId, currentUserEmail, targetRole);
      if (inv) {
        const updated = list.map(x => x.id === inv.id ? { ...x, status: 'ACCEPTED', acceptedUserEmail: currentUserEmail } : x);
        localStorage.setItem('ds_persona_invites', JSON.stringify(updated));
      }
      setInviteStatus('ACCEPTED');
    }, 400);
  }, [invitationToken, currentUserEmail, setMembership, searchParams]);

  // For VIEWER invites, redirect to chat after acceptance (or if already invalid/used)
  useEffect(() => {
    if (isViewerInvite && (inviteStatus === 'ACCEPTED' || inviteStatus === 'INVALID')) {
      const pid = personaIdParam;
      if (pid) {
        navigate(`/chat?personaId=${encodeURIComponent(pid)}&name=${encodeURIComponent(personaName)}`);
      }
    }
  }, [isViewerInvite, inviteStatus, personaIdParam, personaName, navigate]);

  // If VIEWER invite and user is authenticated, accept immediately then route to chat
  useEffect(() => {
    if (!isViewerInvite) return;
    if (!invitationToken) {
      setInviteStatus('INVALID');
      return;
    }
    if (currentUserEmail && personaIdParam) {
      acceptInviteAndCreateMembership({ token: invitationToken })
        .then(() => setInviteStatus('ACCEPTED'))
        .catch(() => setInviteStatus('INVALID'));
    }
  }, [isViewerInvite, invitationToken, currentUserEmail, personaIdParam]);

  // Removed unconditional redirect so we can accept the invite and register viewer as participant first

  const handleInputChange = (section: keyof ContributionData, field: string, value: any) => {
    setContributionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const addArrayItem = (section: keyof ContributionData, field: string, value: string) => {
    if (value.trim()) {
      setContributionData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: [...(prev[section] as any)[field], value.trim()]
        }
      }));
    }
  };

  const removeArrayItem = (section: keyof ContributionData, field: string, index: number) => {
    setContributionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: (prev[section] as any)[field].filter((_: any, i: number) => i !== index)
      }
    }));
  };

  const handleFileUpload = (
    section: keyof ContributionData,
    field: 'photos' | 'videos' | 'voiceRecordings',
    files: FileList | null
  ) => {
    if (!files) return;
    const fileArray = Array.from(files).map((f) => ({ file: f, title: '', description: '', date: '', location: '' }));
    setContributionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...(prev[section] as any)[field], ...fileArray]
      }
    }));
  };

  const removeMediaItem = (field: 'photos' | 'videos' | 'voiceRecordings', index: number) => {
    setContributionData(prev => ({
      ...prev,
      memories: {
        ...prev.memories,
        [field]: (prev.memories as any)[field].filter((_: any, i: number) => i !== index)
      }
    }));
  };

  const updateMediaMeta = (
    field: 'photos' | 'videos' | 'voiceRecordings',
    index: number,
    metaKey: 'title' | 'description' | 'date' | 'location',
    value: string
  ) => {
    setContributionData(prev => {
      const list = [...(prev.memories as any)[field]];
      list[index] = { ...list[index], [metaKey]: value };
      return { ...prev, memories: { ...prev.memories, [field]: list } } as ContributionData;
    });
  };

  // Remove file helper not used in current UI; keep for future enhancements

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    // Live: submit full contribution to Supabase when logged in
    const token = searchParams.get('invitation') || '';
    const list = readInvites();
    const inv = list.find(i => i.token === token);
    const pid = inv?.personaId || personaIdParam;
    if (pid && supabase) {
      try {
        const inviteToken = searchParams.get('invitation') || undefined;
        // Upload media first and replace File objects with signed URLs metadata
        const sanitized = JSON.parse(JSON.stringify(contributionData));
        sanitized.memories.photos = await Promise.all((contributionData.memories.photos || []).map(async (p: any) => {
          try {
            const { signedUrl, path } = await uploadPersonaMedia({ personaId: pid, file: p.file });
            return { title: p.title, description: p.description, date: p.date, location: p.location, url: signedUrl, path };
          } catch {
            return { title: p.title, description: p.description, date: p.date, location: p.location };
          }
        }));
        sanitized.memories.videos = await Promise.all((contributionData.memories.videos || []).map(async (v: any) => {
          try {
            const { signedUrl, path } = await uploadPersonaMedia({ personaId: pid, file: v.file });
            return { title: v.title, description: v.description, date: v.date, location: v.location, url: signedUrl, path };
          } catch {
            return { title: v.title, description: v.description, date: v.date, location: v.location };
          }
        }));
        sanitized.memories.voiceRecordings = await Promise.all((contributionData.memories.voiceRecordings || []).map(async (a: any) => {
          try {
            const { signedUrl, path } = await uploadPersonaMedia({ personaId: pid, file: a.file });
            return { title: a.title, description: a.description, date: a.date, url: signedUrl, path };
          } catch {
            return { title: a.title, description: a.description, date: a.date };
          }
        }));
        await submitPersonaContribution({ personaId: pid, content: sanitized, inviteToken });
        await logPersonaContribution({ personaId: pid, summary: 'New contribution submitted' });
      } catch (e: any) {
        setSubmitError(e?.message || 'Failed to submit contribution');
      }
    } else {
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsSubmitting(false);
    if (!submitError) setSubmitted(true);

    // Record a simple activity signal via invites store (demo mode only)
    try {
      const token2 = searchParams.get('invitation') || '';
      if (token2) {
        const list2 = readInvites();
        const idx = list2.findIndex(i => i.token === token2);
        if (idx >= 0) {
          const current = list2[idx].contributionCount || 0;
          list2[idx].contributionCount = current + 1;
          writeInvites(list2);
          // Live: also log to Supabase activities table, if personaId is known and user is authenticated
          const pid2 = list2[idx].personaId || personaIdParam;
          if (pid2 && supabase) {
            logPersonaContribution({ personaId: pid2, summary: `Contribution from ${currentUserEmail || 'guest'}` }).catch(() => {});
          }
        }
      }
    } catch {}
  };

  const steps = [
    { id: 1, title: 'Personal Info', icon: User },
    { id: 2, title: 'Memories & Stories', icon: FileText },
    { id: 3, title: 'Personality', icon: Heart },
    { id: 4, title: 'Relationships', icon: Users },
    { id: 5, title: 'Review & Submit', icon: Send }
  ];

  if (inviteStatus === 'INVALID') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
              <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to home</span>
              </button>
            </div>
          </div>
        </nav>
        <div className="pt-20 pb-8">
          <div className="max-w-3xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Invitation</h1>
              <p className="text-gray-600">The invite link is invalid, revoked, or already accepted.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const acceptedBanner = inviteStatus === 'ACCEPTED' && (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
      Invitation accepted! Your access has been granted.
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
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

        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thank You for Contributing!
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                Your contributions have been successfully submitted and will help enrich {personaName}'s digital soul.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-green-900 mb-3">What happens next?</h3>
                <ul className="text-green-800 space-y-2 text-left">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Your information will be reviewed and integrated
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    {personaName}'s digital persona will be updated
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    You'll receive a notification when it's complete
                  </li>
                </ul>
              </div>
              
              <button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For VIEWER invites, skip the contribution UI entirely and redirect to chat immediately
  if (isViewerInvite) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
              <button onClick={() => navigate(`/chat?personaId=${encodeURIComponent(personaIdParam)}&name=${encodeURIComponent(personaName)}`)} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Open Chat</button>
            </div>
          </div>
        </nav>
        <div className="pt-24 text-center p-6">
          <p className="text-gray-700">This invite grants viewer access only. Redirecting you to chat…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
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

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              <Heart className="w-4 h-4 mr-2" />
              Contribute to Digital Soul
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Help Enrich {personaName}'s Story
            </h1>
            {acceptedBanner}
            {/* Sign-in prompt removed to allow anon invite-based submissions */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {submitError}
              </div>
            )}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Share your memories, stories, and insights to help create a more complete and authentic digital persona.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.id 
                      ? 'bg-purple-600 border-purple-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-purple-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map(step => (
                <span key={step.id} className={`text-xs ${
                  currentStep >= step.id ? 'text-purple-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={contributionData.personalInfo.name}
                      onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Email *
                    </label>
                    <input
                      type="email"
                      value={contributionData.personalInfo.email}
                      onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Relationship to {personaName} *
                  </label>
                  <select
                    value={contributionData.personalInfo.relationship}
                    onChange={(e) => handleInputChange('personalInfo', 'relationship', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="spouse">Spouse/Partner</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="friend">Friend</option>
                    <option value="colleague">Colleague</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Memories & Stories</h2>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Share Stories</label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Story title"
                      className="p-3 border border-gray-300 rounded-lg"
                      value={storyTitle}
                      onChange={(e) => setStoryTitle(e.target.value)}
                    />
                    <textarea
                      rows={2}
                      placeholder="Write a short story or memory..."
                      className="p-3 border border-gray-300 rounded-lg"
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    onClick={() => {
                      if (!storyTitle.trim() && !storyText.trim()) return;
                      setContributionData(prev => ({
                        ...prev,
                        memories: {
                          ...prev.memories,
                          stories: [...prev.memories.stories, { title: storyTitle.trim() || 'Untitled', text: storyText.trim() || '' }]
                        }
                      }));
                      setStoryTitle('');
                      setStoryText('');
                    }}
                  >
                    Add Story
                  </button>
                  {contributionData.memories.stories.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {contributionData.memories.stories.map((s, idx) => (
                        <div key={idx} className="p-3 border border-gray-200 rounded-lg flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{s.title}</div>
                            <div className="text-sm text-gray-700 whitespace-pre-line">{s.text}</div>
                          </div>
                          <button className="text-red-600 text-sm" onClick={() => {
                            setContributionData(prev => ({
                              ...prev,
                              memories: { ...prev.memories, stories: prev.memories.stories.filter((_, i) => i !== idx) }
                            }));
                          }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photos
                  </label>
                  <label
                    htmlFor={photoInputId}
                    className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); handleFileUpload('memories', 'photos', e.dataTransfer.files); }}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Drag and drop photos here, or click to browse</p>
                  </label>
                  <input
                    id={photoInputId}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload('memories', 'photos', e.target.files)}
                    className="hidden"
                  />
                  {contributionData.memories.photos.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {contributionData.memories.photos.map((p, idx) => (
                        <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-sm text-gray-700 truncate mb-2">{p.file.name}</div>
                          <div className="grid md:grid-cols-4 gap-2">
                            <input className="p-2 border rounded-lg" placeholder="Title" value={p.title} onChange={(e) => updateMediaMeta('photos', idx, 'title', e.target.value)} />
                            <input className="p-2 border rounded-lg" placeholder="Description" value={p.description} onChange={(e) => updateMediaMeta('photos', idx, 'description', e.target.value)} />
                            <input className="p-2 border rounded-lg" type="date" value={p.date || ''} onChange={(e) => updateMediaMeta('photos', idx, 'date', e.target.value)} />
                            <input className="p-2 border rounded-lg" placeholder="Location" value={p.location || ''} onChange={(e) => updateMediaMeta('photos', idx, 'location', e.target.value)} />
                          </div>
                          <div className="mt-2 text-right">
                            <button className="text-red-600 text-sm" onClick={() => removeMediaItem('photos', idx)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Videos</label>
                  <label
                    htmlFor={videoInputId}
                    className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); handleFileUpload('memories', 'videos', e.dataTransfer.files); }}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Drag and drop videos here, or click to browse</p>
                  </label>
                  <input
                    id={videoInputId}
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={(e) => handleFileUpload('memories', 'videos', e.target.files)}
                    className="hidden"
                  />
                  {contributionData.memories.videos.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {contributionData.memories.videos.map((v, idx) => (
                        <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-sm text-gray-700 truncate mb-2">{v.file.name}</div>
                          <div className="grid md:grid-cols-4 gap-2">
                            <input className="p-2 border rounded-lg" placeholder="Title" value={v.title} onChange={(e) => updateMediaMeta('videos', idx, 'title', e.target.value)} />
                            <input className="p-2 border rounded-lg" placeholder="Description" value={v.description} onChange={(e) => updateMediaMeta('videos', idx, 'description', e.target.value)} />
                            <input className="p-2 border rounded-lg" type="date" value={v.date || ''} onChange={(e) => updateMediaMeta('videos', idx, 'date', e.target.value)} />
                            <input className="p-2 border rounded-lg" placeholder="Location" value={v.location || ''} onChange={(e) => updateMediaMeta('videos', idx, 'location', e.target.value)} />
                          </div>
                          <div className="mt-2 text-right">
                            <button className="text-red-600 text-sm" onClick={() => removeMediaItem('videos', idx)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voice Recordings</label>
                  <label
                    htmlFor={audioInputId}
                    className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); handleFileUpload('memories', 'voiceRecordings', e.dataTransfer.files); }}
                  >
                    <Mic className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Upload voice messages (optional)</p>
                  </label>
                  <input
                    id={audioInputId}
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={(e) => handleFileUpload('memories', 'voiceRecordings', e.target.files)}
                    className="hidden"
                  />
                  {contributionData.memories.voiceRecordings.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {contributionData.memories.voiceRecordings.map((a, idx) => (
                        <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                          <div className="text-sm text-gray-700 truncate mb-2">{a.file.name}</div>
                          <div className="grid md:grid-cols-3 gap-2">
                            <input className="p-2 border rounded-lg" placeholder="Title" value={a.title} onChange={(e) => updateMediaMeta('voiceRecordings', idx, 'title', e.target.value)} />
                            <input className="p-2 border rounded-lg" placeholder="Description" value={a.description} onChange={(e) => updateMediaMeta('voiceRecordings', idx, 'description', e.target.value)} />
                            <input className="p-2 border rounded-lg" type="date" value={a.date || ''} onChange={(e) => updateMediaMeta('voiceRecordings', idx, 'date', e.target.value)} />
                          </div>
                          <div className="mt-2 text-right">
                            <button className="text-red-600 text-sm" onClick={() => removeMediaItem('voiceRecordings', idx)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Personality & Traits</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personality Traits
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contributionData.personality.traits.map((trait, index) => (
                      <span key={index} className="flex items-center bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                        {trait}
                        <button
                          onClick={() => removeArrayItem('personality', 'traits', index)}
                          className="ml-2 text-purple-500 hover:text-purple-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a trait (e.g., kind, funny, wise)"
                      className="flex-1 p-2 border border-gray-300 rounded-lg"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addArrayItem('personality', 'traits', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addArrayItem('personality', 'traits', input.value);
                        input.value = '';
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests & Hobbies
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contributionData.personality.interests.map((interest, index) => (
                      <span key={index} className="flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {interest}
                        <button
                          onClick={() => removeArrayItem('personality', 'interests', index)}
                          className="ml-2 text-blue-500 hover:text-blue-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an interest (e.g., cooking, gardening)"
                      className="flex-1 p-2 border border-gray-300 rounded-lg"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addArrayItem('personality', 'interests', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addArrayItem('personality', 'interests', input.value);
                        input.value = '';
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Relationships & Connections</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Members
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe family relationships, important family members, family traditions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Significant Life Events
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Share important life events, milestones, challenges overcome..."
                  />
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Submit</h2>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Summary of Your Contribution</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">{contributionData.personalInfo.name || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Relationship:</span>
                      <span className="ml-2 text-gray-900">{contributionData.personalInfo.relationship || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Personality Traits:</span>
                      <span className="ml-2 text-gray-900">
                        {contributionData.personality.traits.length > 0 
                          ? contributionData.personality.traits.join(', ') 
                          : 'None added'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Interests:</span>
                      <span className="ml-2 text-gray-900">
                        {contributionData.personality.interests.length > 0 
                          ? contributionData.personality.interests.join(', ') 
                          : 'None added'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Star className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Your contribution matters</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        Every story, memory, and detail you share helps create a more authentic and complete digital persona.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>

              {currentStep < 5 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isSubmitting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Contribution'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributorPage;
