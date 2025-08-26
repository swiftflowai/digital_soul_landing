import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';
import AuthModal from './auth/AuthModal';
import { useAuthRole } from '../context/AuthRoleContext';

const Hero = () => {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; view: 'login' | 'register' }>({
    isOpen: false,
    view: 'register'
  });
  const navigate = useNavigate();
  const { currentUserEmail } = useAuthRole();

  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModal({ isOpen: true, view });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, view: 'register' });
  };

  const scrollToDemo = () => {
    const element = document.querySelector('#demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-500"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-purple-300 rounded-full opacity-20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            ></div>
          ))}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="flex justify-center">
              <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Preserve Your Legacy Forever</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
              What if your story
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                could live forever?
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xl md:text-2xl text-gray-600 leading-relaxed">
              Your memories, your voice, your essence — preserved in a Digital Soul 
              that keeps your story alive for generations to come.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <button 
                onClick={() => {
                  if (currentUserEmail) navigate('/dashboard');
                  else openAuthModal('register');
                }}
                className="group bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <span>Create Your Digital Soul</span>
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                </span>
              </button>
              
              <button 
                onClick={scrollToDemo}
                className="group flex items-center space-x-3 text-gray-700 hover:text-purple-600 transition-colors duration-300"
              >
                <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:bg-purple-50 transition-all duration-300">
                  <Play className="w-5 h-5 ml-1" />
                </div>
                <span className="font-medium text-lg">See How It Works</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialView={authModal.view}
      />
    </>
  );
};

export default Hero;