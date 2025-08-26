import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  User, 
  Heart, 
  MessageCircle, 
  Camera, 
  Mic, 
  Check,
  Upload,
  X,
  Sparkles
} from 'lucide-react';
import Logo from '../components/Logo';
import { Persona } from '../types/persona';
import { useAuthRole } from '../context/AuthRoleContext';
import { createPersona as createPersonaLive, getCurrentUserId, addPersonaMemories } from '../services/supabaseHelpers';

interface PersonaData {
  basicInfo: {
    name: string;
    birthDate: string;
    relationship: string;
    personality: string[];
  };
  memories: {
    stories: string[];
    photos: File[];
    voiceRecordings: File[];
  };
  preferences: {
    communicationStyle: string;
    topics: string[];
    privacyLevel: string;
  };
}

const PersonaSetupPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [creatorType, setCreatorType] = useState<'SELF' | 'OTHER' | null>(null);
  const [consentType, setConsentType] = useState<'SELF_ATTESTED' | 'SUBJECT_ACCEPTED' | 'LEGAL_AUTH' | null>(null);
  const [personaData, setPersonaData] = useState<PersonaData>({
    basicInfo: {
      name: '',
      birthDate: '',
      relationship: '',
      personality: []
    },
    memories: {
      stories: [],
      photos: [],
      voiceRecordings: []
    },
    preferences: {
      communicationStyle: '',
      topics: [],
      privacyLevel: 'family'
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [basicInfoError, setBasicInfoError] = useState<string | null>(null);
  const [whoError, setWhoError] = useState<string | null>(null);
  const { addPersona, setMembership, currentUserEmail, isSupabaseAuth } = useAuthRole();

  // Scroll to top and detect auth mode
  useEffect(() => {
    window.scrollTo(0, 0);
    if (isSupabaseAuth && currentUserEmail) {
      setUserInfo({ email: currentUserEmail, isDemo: false });
      return;
    }
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    } else {
      navigate('/');
    }
  }, [navigate, isSupabaseAuth, currentUserEmail]);

  // Add demo data for demo user
  useEffect(() => {
    if (userInfo?.isDemo) {
      setPersonaData(prev => ({
        ...prev,
        basicInfo: {
          ...prev.basicInfo,
          name: 'Sarah Johnson',
          relationship: 'grandparent',
          personality: ['Warm and caring', 'Witty and humorous', 'Traditional and family-oriented']
        },
        memories: {
          ...prev.memories,
          stories: [
            "Sarah always made the best apple pie for family gatherings. She would spend hours in the kitchen, and the whole house would smell amazing.",
            "She loved telling stories about growing up in the 1950s and how different life was back then.",
            "Every Sunday, she would call all her grandchildren to check in and share wisdom about life."
          ]
        },
        preferences: {
          ...prev.preferences,
          communicationStyle: 'Warm and encouraging',
          topics: ['Family memories and stories', 'Life advice and wisdom', 'Cooking and recipes'],
          privacyLevel: 'family'
        }
      }));
    }
  }, [userInfo]);

  const personalityTraits = [
    'Warm and caring', 'Witty and humorous', 'Patient and understanding',
    'Adventurous', 'Creative and artistic', 'Analytical and logical',
    'Spiritual and reflective', 'Practical and down-to-earth', 'Optimistic',
    'Traditional and family-oriented', 'Intellectual and curious', 'Emotional and expressive'
  ];

  const communicationStyles = [
    'Conversational and casual',
    'Formal and respectful',
    'Storytelling and narrative',
    'Direct and straightforward',
    'Encouraging and supportive',
    'Wise and philosophical'
  ];

  const topicOptions = [
    'Family memories and stories',
    'Life advice and wisdom',
    'Personal experiences and lessons',
    'Cultural traditions and values',
    'Hobbies and interests',
    'Professional experiences',
    'Travel and adventures',
    'Cooking and recipes',
    'Music and entertainment',
    'Books and literature',
    'Spiritual and religious topics',
    'Current events and opinions'
  ];

  const handleBasicInfoChange = (field: string, value: string | string[]) => {
    setPersonaData(prev => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: value
      }
    }));
  };

  const handlePersonalityToggle = (trait: string) => {
    const current = personaData.basicInfo.personality;
    const updated = current.includes(trait)
      ? current.filter(t => t !== trait)
      : [...current, trait];
    handleBasicInfoChange('personality', updated);
  };

  const handleStoryAdd = () => {
    const newStory = prompt('Share a memory or story about this person:');
    if (newStory && newStory.trim()) {
      setPersonaData(prev => ({
        ...prev,
        memories: {
          ...prev.memories,
          stories: [...prev.memories.stories, newStory.trim()]
        }
      }));
    }
  };

  const handleStoryRemove = (index: number) => {
    setPersonaData(prev => ({
      ...prev,
      memories: {
        ...prev.memories,
        stories: prev.memories.stories.filter((_, i) => i !== index)
      }
    }));
  };

  const handleFileUpload = (type: 'photos' | 'voiceRecordings', files: FileList | null) => {
    if (files) {
      setPersonaData(prev => ({
        ...prev,
        memories: {
          ...prev.memories,
          [type]: [...prev.memories[type], ...Array.from(files)]
        }
      }));
    }
  };

  const handleFileRemove = (type: 'photos' | 'voiceRecordings', index: number) => {
    setPersonaData(prev => ({
      ...prev,
      memories: {
        ...prev.memories,
        [type]: prev.memories[type].filter((_, i) => i !== index)
      }
    }));
  };

  const handlePreferenceChange = (field: string, value: string | string[]) => {
    setPersonaData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }));
  };

  const handleTopicToggle = (topic: string) => {
    const current = personaData.preferences.topics;
    const updated = current.includes(topic)
      ? current.filter(t => t !== topic)
      : [...current, topic];
    handlePreferenceChange('topics', updated);
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!creatorType) {
        setWhoError('Please choose who this persona is for.');
        return;
      }
      setWhoError(null);
    }
    if (currentStep === 1) {
      const name = (personaData.basicInfo.name || '').trim();
      if (!name) {
        setBasicInfoError('Full Name is required');
        return;
      }
      setBasicInfoError(null);
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Client-side required validation
    const name = (personaData.basicInfo.name || '').trim();
    if (!name) {
      setBasicInfoError('Full Name is required');
      setCurrentStep(1);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (isSupabaseAuth) {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const privacyMap: Record<string, 'PRIVATE' | 'LINK' | 'PUBLIC'> = {
          private: 'PRIVATE',
          family: 'PRIVATE',
          friends: 'PRIVATE',
        };
        const created = await createPersonaLive({
          created_by: userId,
          creator_type: (creatorType as any) || 'OTHER',
          name,
          privacy: privacyMap[personaData.preferences.privacyLevel] || 'PRIVATE',
        } as any);
        if (!created?.id) throw new Error('Persona was not created');
        // Persist stories/memories provided during setup
        const setupStories = (personaData.memories.stories || []).map(s => (s || '').trim()).filter(Boolean)
        if (setupStories.length > 0) {
          try { await addPersonaMemories({ personaId: created.id, stories: setupStories, source: 'SETUP' }); } catch {}
        }
        navigate('/dashboard');
      } else {
        const email = userInfo?.email;
        const persona: Persona = {
          id: `p_${Date.now()}`,
          subjectFullName: name,
          createdByUserEmail: email,
          creatorType: (creatorType as any) || 'OTHER',
          privacy: (personaData.preferences.privacyLevel?.toUpperCase() as any) || 'FAMILY',
          createdAt: new Date().toISOString(),
        };
        addPersona(persona);
        if (email) setMembership(persona.id, email, 'OWNER');
        navigate('/dashboard');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to create persona');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 0, title: 'Who is this for?', icon: <User className="w-5 h-5" /> },
    { id: 1, title: 'Basic Information', icon: <User className="w-5 h-5" /> },
    { id: 2, title: 'Memories & Stories', icon: <Heart className="w-5 h-5" /> },
    { id: 3, title: 'Communication Style', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 4, title: 'Review & Create', icon: <Check className="w-5 h-5" /> }
  ];

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-purple-100 rounded-full px-6 py-3 mb-6">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                {userInfo?.isDemo ? 'Demo Mode' : 'Create Your Digital Soul'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Persona Setup
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {userInfo?.isDemo 
                ? `Welcome ${userInfo.name}! Let's create a digital persona for your grandmother Sarah.`
                : "Let's create a digital persona that captures the essence and personality of your loved one."
              }
            </p>
            {userInfo?.isDemo && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Demo mode: Pre-filled with sample data for Sarah Johnson (grandmother)
                </p>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-3 ${
                    currentStep >= step.id ? 'text-purple-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step.id 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className="hidden md:block font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-purple-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Who is this persona for?</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { setWhoError(null); setCreatorType('SELF'); setConsentType('SELF_ATTESTED'); setCurrentStep(1); }}
                    className={`p-6 rounded-xl border-2 text-left transition-colors ${
                      creatorType === 'SELF' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">For myself</div>
                    <div className="text-gray-600 text-sm">Create and own your personal digital soul</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWhoError(null); setCreatorType('OTHER'); }}
                    className={`p-6 rounded-xl border-2 text-left transition-colors ${
                      creatorType === 'OTHER' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">For someone else</div>
                    <div className="text-gray-600 text-sm">Create a persona for a family member or loved one</div>
                  </button>
                </div>

                {creatorType === 'OTHER' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 font-medium">Consent</p>
                    <div className="grid md:grid-cols-3 gap-3">
                      {[
                        { v: 'SUBJECT_ACCEPTED', l: 'Subject will accept invite' },
                        { v: 'LEGAL_AUTH', l: 'I have legal authorization' },
                        { v: 'SELF_ATTESTED', l: 'I attest responsibly' },
                      ].map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => { setWhoError(null); setConsentType(opt.v as any); setCurrentStep(1); }}
                          className={`p-4 rounded-lg border-2 text-left transition-colors ${
                            consentType === (opt.v as any) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">We’ll record this choice and allow uploading a consent document later.</p>
                  </div>
                )}
                {whoError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{whoError}</div>
                )}
              </div>
            )}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={personaData.basicInfo.name}
                      onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                      required
                      aria-invalid={!!basicInfoError}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent ${
                        basicInfoError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
                      }`}
                      placeholder="Enter their full name"
                    />
                    {basicInfoError && (
                      <p className="mt-1 text-sm text-red-600">{basicInfoError}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={personaData.basicInfo.birthDate}
                      onChange={(e) => handleBasicInfoChange('birthDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Relationship *
                  </label>
                  <select
                    value={personaData.basicInfo.relationship}
                    onChange={(e) => handleBasicInfoChange('relationship', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="parent">Parent</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="child">Child</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Personality Traits (Select all that apply)
                  </label>
                  <div className="grid md:grid-cols-3 gap-3">
                    {personalityTraits.map((trait) => (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => handlePersonalityToggle(trait)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          personaData.basicInfo.personality.includes(trait)
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Memories & Stories</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Share Stories and Memories
                  </label>
                  <div className="space-y-4">
                    {personaData.memories.stories.map((story, index) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-gray-700">{story}</p>
                        </div>
                        <button
                          onClick={() => handleStoryRemove(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleStoryAdd}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                    >
                      + Add a story or memory
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Upload Photos
                    </label>
                    <div className="space-y-3">
                      {personaData.memories.photos.map((file, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Camera className="w-5 h-5 text-gray-400" />
                          <span className="flex-1 text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => handleFileRemove('photos', index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <label className="block p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-purple-400 hover:text-purple-600 transition-colors">
                        <Upload className="w-6 h-6 mx-auto mb-2" />
                        <span>Upload photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload('photos', e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Voice Recordings
                    </label>
                    <div className="space-y-3">
                      {personaData.memories.voiceRecordings.map((file, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Mic className="w-5 h-5 text-gray-400" />
                          <span className="flex-1 text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => handleFileRemove('voiceRecordings', index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <label className="block p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-purple-400 hover:text-purple-600 transition-colors">
                        <Mic className="w-6 h-6 mx-auto mb-2" />
                        <span>Upload voice recordings</span>
                        <input
                          type="file"
                          multiple
                          accept="audio/*"
                          onChange={(e) => handleFileUpload('voiceRecordings', e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Communication Preferences</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Communication Style
                  </label>
                  <div className="space-y-3">
                    {communicationStyles.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handlePreferenceChange('communicationStyle', style)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          personaData.preferences.communicationStyle === style
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Topics of Conversation (Select all that apply)
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {topicOptions.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleTopicToggle(topic)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          personaData.preferences.topics.includes(topic)
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Privacy Level
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: 'private', label: 'Private - Only you can access', description: 'Keep your digital soul completely private' },
                      { value: 'family', label: 'Family - Share with family members', description: 'Allow family to interact with the persona' },
                      { value: 'friends', label: 'Friends - Share with close friends', description: 'Extend access to trusted friends' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handlePreferenceChange('privacyLevel', option.value)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          personaData.preferences.privacyLevel === option.value
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm opacity-75">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{errorMsg}</div>
                )}
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Create</h2>
                
                <div className="bg-purple-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <strong>Name:</strong> {personaData.basicInfo.name || 'Not provided'}
                    </div>
                    <div>
                      <strong>Relationship:</strong> {personaData.basicInfo.relationship || 'Not specified'}
                    </div>
                    <div>
                      <strong>Personality Traits:</strong> {personaData.basicInfo.personality.length} selected
                    </div>
                    <div>
                      <strong>Stories:</strong> {personaData.memories.stories.length} shared
                    </div>
                    <div>
                      <strong>Photos:</strong> {personaData.memories.photos.length} uploaded
                    </div>
                    <div>
                      <strong>Voice Recordings:</strong> {personaData.memories.voiceRecordings.length} uploaded
                    </div>
                    <div>
                      <strong>Communication Style:</strong> {personaData.preferences.communicationStyle || 'Not selected'}
                    </div>
                    <div>
                      <strong>Topics:</strong> {personaData.preferences.topics.length} selected
                    </div>
                    <div>
                      <strong>Privacy:</strong> {personaData.preferences.privacyLevel}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">What happens next?</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li>• Our AI will analyze the provided information</li>
                    <li>• We'll create a personalized digital persona</li>
                    <li>• You'll be able to interact with your digital soul</li>
                    <li>• Family members can be invited to connect</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create Digital Soul</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaSetupPage;
