import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mic, 
  Play, 
  Pause, 
  Upload,
  FileAudio,
  Waveform,
  Target,
  Clock,
  Star,
  Info,
  Check,
  Volume2,
  VolumeX
} from 'lucide-react';
import PersonaVoicePanel from '../components/PersonaVoicePanel';
import { supabase } from '../utils/supabaseClient';
import Logo from '../components/Logo';

const VoiceClonePage = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSample, setCurrentSample] = useState(0);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [uploadMode, setUploadMode] = useState<'record' | 'upload'>('record');
  const [samplesRecorded, setSamplesRecorded] = useState(0);

  const sampleTexts = [
    "Hello, I'm Sarah. It's wonderful to meet you!",
    "I love spending time with family and friends.",
    "My favorite memories are from our family vacations.",
    "I believe in kindness and helping others.",
    "Life is beautiful when we share it with loved ones.",
    "I enjoy cooking and trying new recipes.",
    "Music has always been a big part of my life.",
    "I'm grateful for every moment we have together.",
    "My children are my greatest joy and pride.",
    "I believe in the power of love and connection."
  ];

  const startTraining = () => {
    if (samplesRecorded < 3) {
      alert('You need at least 3 samples to start training.');
      return;
    }
    
    setIsTraining(true);
    setTrainingProgress(0);
    
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleSampleSelect = (index: number) => {
    setCurrentSample(index);
  };

  const simulateRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setSamplesRecorded(prev => prev + 1);
    }, 3000);
  };

  const simulateUpload = () => {
    alert('File upload simulated! This would upload an audio file in a real implementation.');
    setSamplesRecorded(prev => prev + 1);
  };

  const simulatePlay = () => {
    setIsPlaying(true);
    setTimeout(() => {
      setIsPlaying(false);
    }, 2000);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase?.auth.getSession()!;
      setAuthToken(data.session?.access_token ?? null);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Logo />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  voiceEnabled 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              <Waveform className="w-4 h-4 mr-2" />
              Voice Clone Training
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Create Your Voice Clone
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Record your voice samples or upload existing recordings to create a realistic voice clone for your digital soul.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Sample Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-600" />
                  Voice Samples
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sampleTexts.map((text, index) => (
                    <div
                      key={index}
                      onClick={() => handleSampleSelect(index)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        currentSample === index
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 mb-2">{text}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              0:00
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              index < samplesRecorded 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {index < samplesRecorded ? 'Recorded' : 'Not Recorded'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {index < samplesRecorded && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                simulatePlay();
                              }}
                              className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                          {index < samplesRecorded && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Panel - Real implementation panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                {authToken ? (
                  <PersonaVoicePanel personaId={"placeholder-persona-id"} authToken={authToken} />
                ) : (
                  <div className="text-sm text-gray-600">Sign in to access voice features.</div>
                )}
              </div>
            </div>

            {/* Right Panel - Training & Progress */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Training Progress */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-600" />
                    Training Progress
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Voice Model Training
                      </span>
                      <span className="text-sm text-gray-500">
                        {trainingProgress}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${trainingProgress}%` }}
                      ></div>
                    </div>

                    <button
                      onClick={startTraining}
                      disabled={isTraining || samplesRecorded < 3}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        isTraining || samplesRecorded < 3
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isTraining ? 'Training...' : 'Start Training (Demo)'}
                    </button>

                    <div className="text-xs text-gray-500 text-center">
                      Need at least 3 samples to start training
                    </div>
                  </div>
                </div>

                {/* Quality Metrics */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-purple-600" />
                    Quality Metrics
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Samples Recorded</span>
                      <span className="text-sm font-medium">{samplesRecorded}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Quality</span>
                      <span className="text-sm font-medium">
                        {samplesRecorded > 0 ? '85%' : '0%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Model Status</span>
                      <span className="text-sm font-medium text-green-600">
                        {trainingProgress === 100 ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    Voice Clone Tips
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Record in a quiet environment</li>
                    <li>• Speak naturally and clearly</li>
                    <li>• Provide samples with different emotions</li>
                    <li>• Upload existing recordings if available</li>
                    <li>• More samples = better voice quality</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceClonePage;
