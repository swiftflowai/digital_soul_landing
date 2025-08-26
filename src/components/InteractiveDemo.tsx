import { useRef, useState } from 'react';
import { MessageCircle, Calendar, Mic, Image as ImageIcon, Play, Heart, User, Bot, Paperclip, Send, Clock, Upload, MicOff } from 'lucide-react';

const InteractiveDemo = () => {
  const [activeTab, setActiveTab] = useState('chat');
  // const [isPlaying, setIsPlaying] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'upload' | 'read_script'>('upload');
  const [voiceStatus] = useState<'not_started' | 'processing' | 'ready'>('not_started');
  // const [scriptRecordings, setScriptRecordings] = useState<{ url: string }[]>([]);
  // const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // const mediaStreamRef = useRef<MediaStream | null>(null);
  // Recording disabled in demo - state kept for type parity but unused
  // const [activePromptIndex, setActivePromptIndex] = useState<number | null>(null);
  // const [isRecording, setIsRecording] = useState(false);
  // Demo chat voice input
  const recognitionRefChat = useRef<any>(null);
  const [isListeningDemo, setIsListeningDemo] = useState(false);

  const tabs = [
    { id: 'chat', label: 'Chat Interface', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'timeline', label: 'Memory Timeline', icon: <Calendar className="w-5 h-5" /> },
    { id: 'voice', label: 'Voice Clone', icon: <Mic className="w-5 h-5" /> },
    { id: 'gallery', label: 'Photo Gallery', icon: <ImageIcon className="w-5 h-5" /> }
  ];

  const chatMessages = [
    { type: 'user', text: "Tell me about your childhood summers" },
    { type: 'soul', text: "Oh, those were magical times! I remember spending entire days at my grandmother's lake house. The smell of her famous blueberry pancakes would wake me up every morning, and we'd spend hours fishing off the old wooden dock." },
    { type: 'user', text: "What was your favorite memory there?" },
    { type: 'soul', text: "There was this one evening when I was about ten. The sunset painted the whole lake golden, and my grandmother taught me how to skip stones. She said each ripple carried a wish into the universe. I still think about that whenever I see a sunset over water." }
  ];

  const timelineEvents = [
    { year: '1958', title: 'Grandma’s Lake House', description: 'Skipping stones at golden hour; “each ripple carries a wish”.' },
    { year: '1979', title: 'First Job', description: 'Saved to buy a used guitar—started Sunday song nights.' },
    { year: '1998', title: 'Family Traditions', description: 'Sunday calls with grandkids; shared recipes and wisdom.' },
    { year: '2005', title: 'Apple Pie Legacy', description: 'Perfected the cinnamon balance; passed the recipe down.' }
  ];

  const galleryImages = [
    "https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    "https://images.pexels.com/photos/1128317/pexels-photo-1128317.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
    "https://images.pexels.com/photos/1128316/pexels-photo-1128316.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDemoSend = () => {
    if (!demoInput.trim()) return;
    chatMessages.push({ type: 'user', text: demoInput.trim() });
    setDemoInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      chatMessages.push({
        type: 'soul',
        text:
          "That's wonderful to hear! I love connecting with family and friends. Is there anything specific you'd like to talk about or any memories you'd like to share?",
      });
    }, 900);
  };

  // Initialize demo speech recognition if available
  if (typeof window !== 'undefined' && !recognitionRefChat.current) {
    const anyWindow = window as unknown as Record<string, any>;
    if (anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition) {
      const SpeechRecognition = anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onstart = () => setIsListeningDemo(true);
      rec.onend = () => setIsListeningDemo(false);
      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setDemoInput(transcript);
          // Auto-send for demo
          setTimeout(() => handleDemoSend(), 100);
        }
      };
      recognitionRefChat.current = rec;
    }
  }

  const startListeningDemo = () => {
    try { recognitionRefChat.current?.start?.(); } catch {}
  };
  const stopListeningDemo = () => {
    try { recognitionRefChat.current?.stop?.(); } catch {}
  };

  // Disabled recording handlers
  // Disabled recording helpers (intentionally unused)
  // const startRecording = async (_index: number) => { alert('Demo only: recording is disabled.'); };
  // const stopRecording = () => { /* no-op in demo */ };

  return (
    <section id="demo" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Your Legacy,
            <br />
            <span className="text-purple-600">In Your Hands</span>
          </h2>
          <p className="max-w-2xl mx-auto text-xl text-gray-600">
            See how your Digital Soul comes to life through interactive conversations, 
            cherished memories, and authentic voice preservation
          </p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 shadow-2xl">
          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Demo Content */}
          <div className="bg-white rounded-2xl shadow-lg min-h-[400px] overflow-hidden">
            {activeTab === 'chat' && (
              <div className="flex flex-col" style={{ minHeight: 420 }}>
                {/* Header aligned with real chat */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Sarah Johnson</h3>
                      <p className="text-xs text-gray-600">Digital Soul • Online</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user' ? 'bg-purple-600' : 'bg-gray-200'}`}>
                          {message.type === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className={`${message.type === 'user' ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border border-gray-200'} rounded-2xl px-4 py-2`}>
                          <p className="text-sm">{message.text}</p>
                          <div className={`flex items-center space-x-1 mt-1 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <Clock className="w-3 h-3 opacity-60" />
                            <span className={`text-xs opacity-60 ${message.type === 'user' ? 'text-white' : 'text-gray-500'}`}>{formatTime(new Date())}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

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
                </div>

                {/* Input aligned with real chat */}
                <div className="bg-white border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <input
                        value={demoInput}
                        onChange={(e) => setDemoInput(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={isListeningDemo ? stopListeningDemo : startListeningDemo}
                      disabled={!recognitionRefChat.current}
                      className={`p-3 rounded-full transition-colors ${
                        isListeningDemo ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-purple-600 text-white hover:bg-purple-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isListeningDemo ? 'Stop listening' : 'Start voice input'}
                    >
                      {isListeningDemo ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={handleDemoSend}
                      disabled={!demoInput.trim()}
                      className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="p-6">
                <div className="space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">{event.year}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                        <p className="text-gray-600 text-sm">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                    <button onClick={() => setVoiceMode('upload')} className={`px-4 py-2 text-sm ${voiceMode === 'upload' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}>Upload Samples</button>
                    <button onClick={() => setVoiceMode('read_script')} className={`px-4 py-2 text-sm ${voiceMode === 'read_script' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}>Read Script</button>
                  </div>
                  {voiceMode === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Voice Samples (Demo)</label>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => alert('Demo only: uploads are disabled.')}
                          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Upload className="w-5 h-5" />
                          <span>Add audio files (disabled)</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {voiceMode === 'read_script' && (
                    <div className="space-y-3">
                      {["Please read this paragraph clearly and at a natural pace.", "Now read a different phrase with some variation in pacing and emotion.", "Finally, read this sentence with a warm and friendly tone."].map((text, i) => (
                        <div key={i} className="p-4 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-700 mb-3">{text}</p>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => alert('Demo only: recording is disabled.')} className="px-3 py-2 bg-purple-600 text-white rounded-lg flex items-center space-x-1"><Mic className="w-4 h-4" /><span>Record (disabled)</span></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-600 mb-3">Status</p>
                    {voiceStatus === 'not_started' && (
                      <div className="space-y-4">
                        <p className="text-gray-700">Demo preview only. Uploads and recording are disabled.</p>
                        <button onClick={() => alert('Demo only: cloning is disabled.')} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Start Voice Cloning (disabled)</button>
                      </div>
                    )}
                    {voiceStatus === 'processing' && (
                      <div className="flex items-center space-x-3 text-purple-700"><span className="w-5 h-5 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" /><span>Processing samples…</span></div>
                    )}
                    {voiceStatus === 'ready' && (
                      <div className="space-y-3"><div className="text-green-700 font-medium">Voice profile is ready.</div><button className="px-3 py-2 bg-gray-100 rounded-lg flex items-center space-x-2"><Play className="w-4 h-4" /><span>Preview</span></button></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="p-6">
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => alert('Demo only: uploads are disabled.')}
                    className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-6 h-6" />
                    <span>Add photos (disabled)</span>
                  </button>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((src, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                        <img src={src} alt={`Memory ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;