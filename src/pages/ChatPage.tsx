import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Mic, 
  MicOff,
  Paperclip, 
  Heart, 
  User,
  Bot,
  Clock,
  Volume2,
  VolumeX
} from 'lucide-react';
import Logo from '../components/Logo';
import PersonaAvatar from '../components/PersonaAvatar';
import { speakText, speakTextPreview } from '../lib/api/voice';
import { supabase } from '../utils/supabaseClient';
import { useAuthRole } from '../context/AuthRoleContext';
import { getCurrentUserId, listMyMemberships, listMyPersonas, getMyRoleForPersona } from '../services/supabaseHelpers';
import { useStreamedChat } from '../hooks/useStreamedChat';
import SimliAvatarPanel, { SimliAvatarHandle } from '../components/SimliAvatarPanel';
import FloatingWindow from '../components/FloatingWindow';
import type { ChatMessage } from '../lib/api/chat';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const { currentUserEmail, isSupabaseAuth, personas, memberships } = useAuthRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSimliActive, setIsSimliActive] = useState(false);
  const [isAvatarFloating, setIsAvatarFloating] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('simli:avatar:mode');
      if (saved === 'floating') return true;
      if (saved === 'docked') return false;
    } catch {}
    // Default: floating on large screens, docked on small
    return (window.innerWidth || 0) >= 1024;
  });
  const [personaName, setPersonaName] = useState<string>('');
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<{ id: string; name: string | null }[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'OWNER'|'CONTRIBUTOR'|'VIEWER'|null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasWelcomedRef = useRef<boolean>(false);
  // Always point to latest send handler to avoid stale closures inside speech callbacks
  const handleSendRef = useRef<(text?: string) => void>();
  
  // Speech recognition and synthesis
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const anyWindow = window as unknown as Record<string, any>;

    if ('webkitSpeechRecognition' in anyWindow || 'SpeechRecognition' in anyWindow) {
      const SpeechRecognition = anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        // Use ref so we always call the latest handler with current persona/token
        handleSendRef.current?.(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;
  }, []);

  // Persist avatar mode
  useEffect(() => {
    try { localStorage.setItem('simli:avatar:mode', isAvatarFloating ? 'floating' : 'docked'); } catch {}
  }, [isAvatarFloating]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to top and auth gate (allow viewer links without login)
  useEffect(() => {
    window.scrollTo(0, 0);
    if (currentUserEmail) {
      const isDemo = !isSupabaseAuth && !!JSON.parse(localStorage.getItem('userInfo') || 'null')?.isDemo;
      setUserInfo({ email: currentUserEmail, isDemo });
    } else {
      // Allow guest chat via direct link (viewer access)
      setUserInfo({ email: null, isDemo: false });
    }
    // Welcome via streaming assistant once persona/auth are ready (no fake message)
    if (!hasWelcomedRef.current && authToken && (personaId || userInfo)) {
      hasWelcomedRef.current = true;
      setTimeout(() => {
        streamAssistantWelcome();
      }, 400);
    }
  }, [navigate, currentUserEmail, isSupabaseAuth]);

  // Resolve persona target from URL first
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('personaId');
    const nm = params.get('name');
    const inv = params.get('invitation');
    if (pid) setPersonaId(pid);
    if (nm) setPersonaName(nm);
    if (inv) setInviteToken(inv);
  }, []);

  // Fetch Supabase auth token for server TTS
  useEffect(() => {
    (async () => {
      const { data } = await supabase?.auth.getSession()!;
      setAuthToken(data.session?.access_token ?? null);
    })();
  }, []);

  // Resolve role for this persona to gate UI behavior (viewer can only chat)
  useEffect(() => {
    (async () => {
      try { if (personaId) setMyRole(await getMyRoleForPersona(personaId)); } catch {}
    })();
  }, [personaId, currentUserEmail]);

  // Load persona name (live or demo) - prefer most recent when not specified
  useEffect(() => {
    (async () => {
      if (userInfo?.isDemo) {
        setPersonaName('Sarah Johnson');
        return;
      }
      if (!currentUserEmail) return;
      if (isSupabaseAuth) {
        try {
          const [uid, liveP, liveM] = await Promise.all([
            getCurrentUserId(),
            listMyPersonas(),
            listMyMemberships(),
          ]);
          if (!uid) return;
          const memberIds = new Set(liveM.map(m => m.persona_id));
          const candidates = liveP.filter(p => p.created_by === uid || memberIds.has(p.id));
          setAvailablePersonas(candidates.map(p => ({ id: p.id, name: p.name || null })));
          const target = (personaId ? candidates.find(p => p.id === personaId) : undefined) ||
                        (candidates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]) ||
                        liveP[0];
          if (target) {
            setPersonaName(target.name || 'Chat');
            setPersonaId(target.id);
            const url = new URL(window.location.href);
            url.searchParams.set('personaId', target.id);
            window.history.replaceState({}, '', url.toString());
          }
        } catch {
          setPersonaName('Chat');
        }
      } else {
        const myIds = new Set(
          memberships.filter(m => m.userEmail === currentUserEmail).map(m => m.personaId)
        );
        const candidates = personas.filter(p => myIds.has(p.id));
        setAvailablePersonas(candidates.map((p: any) => ({ id: p.id, name: p.subjectFullName || null })) as any);
        const target = (personaId ? candidates.find(p => p.id === personaId) : undefined) ||
                       (candidates.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]) ||
                       personas[0];
        if (target) {
          setPersonaName((target as any).subjectFullName || 'Chat');
          setPersonaId((target as any).id);
          const url = new URL(window.location.href);
          url.searchParams.set('personaId', (target as any).id);
          window.history.replaceState({}, '', url.toString());
        }
      }
    })();
  }, [isSupabaseAuth, currentUserEmail, userInfo, personas, memberships, personaId]);

  const { assistantReply, isStreaming, start, setAssistantReply } = useStreamedChat(authToken, personaId);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

  // (reserved) const addBotMessage = (text: string) => {
  //   const newMessage: Message = { id: Date.now().toString(), text, sender: 'bot', timestamp: new Date() };
  //   setMessages(prev => [...prev, newMessage]);
  //   if (voiceEnabled && synthesisRef.current) speakMessage(text);
  // };

  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simliRef = useRef<SimliAvatarHandle | null>(null);

  const speakMessage = async (text: string, opts?: { onStart?: () => void }) => {
    try {
      if (!voiceEnabled) return;
      // Prefer server TTS (clone or default) when signed in and persona is known
      if (authToken && personaId) {
        setIsSpeaking(true);
        const { audio } = await speakText(authToken, personaId, text, { autoplay: false });
        if (audio) {
          if (isSimliActive) {
            // Route a copy to Simli (no extra WebAudio output)
            try { await simliRef.current?.attachAudioElement(audio, false); } catch {}
            // Play via HTMLAudioElement only to avoid double audio paths
            try { audio.addEventListener('play', () => { try { opts?.onStart?.(); } catch {} }); } catch {}
            audio.muted = false;
            await audio.play().catch(() => {});
          } else {
            // Simli inactive: normal playback
            audio.muted = false;
            await audio.play().catch(() => {});
          }
        }
        setIsSpeaking(false);
        return;
      }
      // Viewer public preview via invite token
      if (!authToken && personaId && inviteToken) {
        setIsSpeaking(true);
        const { audio } = await speakTextPreview(inviteToken, personaId, text, { autoplay: false });
        if (audio) {
          if (isSimliActive) {
            try { await simliRef.current?.attachAudioElement(audio, false); } catch {}
            try { audio.addEventListener('play', () => { try { opts?.onStart?.(); } catch {} }); } catch {}
            audio.muted = false;
            await audio.play().catch(() => {});
          } else {
            audio.muted = false;
            await audio.play().catch(() => {});
          }
        }
        setIsSpeaking(false);
        return;
      }
    } catch {
      // fall through to browser TTS below
      setIsSpeaking(false);
    }
    if (synthesisRef.current) {
      setIsSpeaking(true);
      synthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthesisRef.current.getVoices();
      const femaleVoice = voices.find((voice: any) => voice.name.includes('Samantha') || voice.name.includes('Victoria') || voice.name.toLowerCase().includes('female'));
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthesisRef.current.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (synthesisRef.current && !voiceEnabled) {
      synthesisRef.current.cancel();
    }
  };

  const streamBotResponse = (userMessage: string) => {
    // Ensure we have a valid persona before attempting to chat
    if (!personaId || !authToken) {
      console.log("Missing persona data:", { personaId, authToken: !!authToken });
      return;
    }
    
    setIsTyping(!isSimliActive);
    const history: ChatMessage[] = [
      ...messages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
      { role: 'user', content: userMessage }
    ];
    setAssistantReply("");
    start(history);
    // Render token-by-token only when Simli avatar is inactive
    if (!isSimliActive) {
      const id = `assist-${Date.now()}`;
      setStreamingMsgId(id);
      setMessages(prev => [...prev, { id, text: '', sender: 'bot', timestamp: new Date(), isTyping: true }]);
    } else {
      setStreamingMsgId(null);
    }
  };

  // Stream a greeting without injecting a visible user message
  const streamAssistantWelcome = () => {
    setIsTyping(true);
    const history: ChatMessage[] = [
      ...messages.map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
      { role: 'user', content: 'Please greet me warmly in one friendly sentence and invite me to share how I am feeling.' }
    ];
    setAssistantReply("");
    start(history);
    const id = `assist-${Date.now()}`;
    setStreamingMsgId(id);
    setMessages(prev => [...prev, { id, text: '', sender: 'bot', timestamp: new Date(), isTyping: true }]);
  };

  // Keep the active assistant bubble synced with latest tokens (text hidden if Simli is active)
  useEffect(() => {
    if (!streamingMsgId || isSimliActive) return;
    setMessages(prev => prev.map(m => (m.id === streamingMsgId ? { ...m, text: assistantReply } : m)));
  }, [assistantReply, streamingMsgId, isSimliActive]);

  // reserved refs for future sync modes
  // const pendingAssistantTextRef = useRef<string | null>(null);
  // const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Finalize once stream completes
  useEffect(() => {
    // finalize only after stream finishes
    if (isStreaming) return;
    // When Simli avatar is active: play voice/lip-sync only; do not show assistant text
    if (isSimliActive) {
      if (assistantReply) void speakMessage(assistantReply);
      setIsTyping(false);
      setStreamingMsgId(null);
      return;
    }
    if (!streamingMsgId) return;
    setIsTyping(false);
    setMessages(prev => prev.map(m => (m.id === streamingMsgId ? { ...m, isTyping: false, text: assistantReply } : m)));
    if (assistantReply) void speakMessage(assistantReply);
    setStreamingMsgId(null);
  }, [isStreaming, streamingMsgId, assistantReply, isSimliActive]);

  const handleSendMessage = (text?: string) => {
    const messageToSend = text || inputText;
    if (messageToSend.trim()) {
      addUserMessage(messageToSend.trim());
      streamBotResponse(messageToSend.trim());
      setInputText('');
    }
  };

  // Keep ref up-to-date so speech callbacks always use fresh state
  useEffect(() => {
    handleSendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

      <div className="pt-16 h-screen flex flex-col">
        {/* Chat Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <PersonaAvatar personaId={personaId} name={personaName} size={48} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{personaName || (userInfo?.isDemo ? 'Sarah Johnson' : 'Chat')}</h1>
              <p className="text-sm text-gray-600">Digital Soul • Online</p>
            </div>
            <div className="ml-auto flex items-center space-x-2">
              {availablePersonas.length > 0 && (
                <select
                  value={personaId || ''}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setPersonaId(nextId);
                    const found = availablePersonas.find(p => p.id === nextId);
                    if (found) setPersonaName(found.name || 'Chat');
                    const url = new URL(window.location.href);
                    if (nextId) url.searchParams.set('personaId', nextId); else url.searchParams.delete('personaId');
                    window.history.replaceState({}, '', url.toString());
                    setMessages([]);
                  }}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                >
                  {availablePersonas.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.id}</option>
                  ))}
                </select>
              )}
              {myRole === 'VIEWER' && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Viewer</span>
              )}
              {userInfo?.isDemo && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Demo Mode
                </span>
              )}
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-full transition-colors ${
                  voiceEnabled 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content: Messages + Avatar (responsive) */}
        <div className="flex-1 px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Messages (left) */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-gray-600">Starting conversation...</p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.sender === 'user' 
                          ? 'bg-purple-600' 
                          : 'bg-gray-200'
                      }`}>
                        {message.sender === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className={`rounded-2xl px-4 py-2 ${
                        message.sender === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                        <div className={`flex items-center space-x-1 mt-1 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}>
                          <Clock className="w-3 h-3 opacity-60" />
                          <span className={`text-xs opacity-60 ${
                            message.sender === 'user' ? 'text-white' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Simli Avatar (single instance; switches between docked/floating without unmounting) */}
            <div className="lg:col-span-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-3 lg:sticky lg:top-28">
                <FloatingWindow
                  id="simli-avatar"
                  title="Simli Live Avatar"
                  initial={{ width: 420 }}
                  onClose={() => setIsAvatarFloating(false)}
                  showHeader={false}
                  dragAnywhere={isAvatarFloating}
                  isFloating={isAvatarFloating}
                >
                  <SimliAvatarPanel
                    ref={simliRef}
                    authToken={authToken}
                    personaId={personaId}
                    onActiveChange={setIsSimliActive}
                    modeToggle={
                      isAvatarFloating ? (
                        <button
                          onClick={() => setIsAvatarFloating(false)}
                          className="px-2 py-1 text-xs rounded-md border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          title="Dock avatar"
                        >
                          Dock
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsAvatarFloating(true)}
                          className="px-2 py-1 text-xs rounded-md border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          title="Float avatar"
                        >
                          Float
                        </button>
                      )
                    }
                  />
                </FloatingWindow>
              </div>
            </div>
          </div>
        </div>

        {/* No separate floating instance; the above window switches layout without unmounting */}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message or click the microphone to speak..."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!recognitionRef.current}
              className={`p-3 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {/* Voice Status */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              {isListening && (
                <span className="flex items-center space-x-1 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Listening...</span>
                </span>
              )}
              {isSpeaking && (
                <span className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Speaking...</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {voiceEnabled && (
                <span className="flex items-center space-x-1">
                  <Volume2 className="w-3 h-3" />
                  <span>Voice enabled</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
