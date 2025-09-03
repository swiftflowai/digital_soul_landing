import { useState } from 'react';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';
import AuthModal from './auth/AuthModal';

const FinalCTA = () => {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; view: 'login' | 'register' }>({
    isOpen: false,
    view: 'register'
  });

  const openAuthModal = () => {
    setAuthModal({ isOpen: true, view: 'register' });
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

  const joinWaitlist = () => {
    window.open('https://forms.gle/DLb32nhdafE3q2Qc7', '_blank', 'noopener');
  };

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full filter blur-xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full filter blur-xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="flex justify-center">
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
                <Heart className="w-5 h-5 text-pink-300" />
                <span className="text-sm font-medium">Your legacy awaits</span>
              </div>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Begin Your
              <br />
              Digital Soul Journey
            </h2>

            <p className="max-w-2xl mx-auto text-xl md:text-2xl text-purple-100 leading-relaxed">
              Every moment you wait is a memory that could be preserved forever. 
              Start building your Digital Soul today and create a legacy that lives on.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <button 
                onClick={openAuthModal}
                className="group bg-white text-purple-600 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center space-x-2">
                  <span>Start Building Yours</span>
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                </span>
              </button>
              
              <button 
                onClick={scrollToDemo}
                className="group flex items-center space-x-3 text-white/90 hover:text-white transition-colors duration-300"
              >
                <span className="font-medium text-lg">Explore Sample Digital Souls</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              <button
                onClick={joinWaitlist}
                className="group bg-white text-purple-600 px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                aria-label="Join the DigitalSoul waitlist"
              >
                Join Waitlist
              </button>
            </div>

            <div className="pt-8 text-sm text-purple-200">
              <p>✨ Free to start • 🔒 Your data stays private • 💝 Cancel anytime</p>
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

export default FinalCTA;