import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut } from 'lucide-react';
import Logo from './Logo';
import AuthModal from './auth/AuthModal';
import { supabase } from '../utils/supabaseClient';

const Navigation = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; view: 'login' | 'register' }>({
    isOpen: false,
    view: 'login'
  });
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string; isDemo?: boolean } | null>(null);

  const navItems = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Demo', href: '#demo' },
    { label: 'Stories', href: '#testimonials' },
    { label: 'Privacy', href: '#trust' },
    { label: 'FAQ', href: '/faq', isRoute: true },
    { label: 'Feedback', href: '#feedback' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;
      if (email) setCurrentUser({ email }); else {
        // Demo fallback
        try {
          const raw = localStorage.getItem('userInfo');
          setCurrentUser(raw ? JSON.parse(raw) : null);
        } catch { setCurrentUser(null); }
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const email = session?.user?.email ?? null;
      // When real session exists, prefer it and keep demo separate
      if (email) {
        setCurrentUser({ email });
      } else {
        setCurrentUser(null);
      }
    });
    const onDemo = () => {
      supabase.auth.getUser().then(({ data: u }) => {
        if (!u.user) {
          try {
            const raw = localStorage.getItem('userInfo');
            setCurrentUser(raw ? JSON.parse(raw) : null);
          } catch { setCurrentUser(null); }
        }
      });
    };
    window.addEventListener('ds-auth-changed', onDemo as EventListener);
    return () => { sub?.subscription?.unsubscribe?.(); window.removeEventListener('ds-auth-changed', onDemo as EventListener); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
    navigate('/');
  };

  const handleNavigation = (href: string, isRoute?: boolean) => {
    if (isRoute) {
      navigate(href);
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModal({ isOpen: true, view });
    setIsMobileMenuOpen(false);
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, view: 'login' });
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Always visible with consistent styling */}
            <button onClick={() => navigate('/')}>
              <Logo 
                className="w-8 h-8" 
                textClassName="text-xl text-gray-900"
              />
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.href, item.isRoute)}
                  className="font-medium text-gray-700 hover:text-purple-600 transition-colors duration-300"
                >
                  {item.label}
                </button>
              ))}
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <UserIcon className="w-5 h-5" />
                    <span className="text-sm">{currentUser.name || currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openAuthModal('register')}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-300"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed top-16 left-0 right-0 bg-white shadow-xl">
            <div className="px-4 py-6 space-y-4">
              {currentUser && (
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <UserIcon className="w-5 h-5 text-gray-700" />
                  <div className="text-sm text-gray-800">{currentUser.name || currentUser.email}</div>
                </div>
              )}
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.href, item.isRoute)}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg font-medium transition-colors duration-300"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 space-y-3">
                {currentUser ? (
                  <>
                    <button
                      onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg font-medium transition-colors duration-300"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="w-full bg-gray-900 text-white px-6 py-3 rounded-full font-semibold"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="w-full text-left px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg font-medium transition-colors duration-300"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => openAuthModal('register')}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full font-semibold"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialView={authModal.view}
      />
    </>
  );
};

export default Navigation;