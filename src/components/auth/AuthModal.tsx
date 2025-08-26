import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
}

const AuthModal = ({ isOpen, onClose, initialView = 'login' }: AuthModalProps) => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot-password'>(initialView);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    // Reset to login view when modal closes
    setTimeout(() => setCurrentView('login'), 300);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen">
        {currentView === 'login' && (
          <Login
            onClose={handleClose}
            onSwitchToRegister={() => setCurrentView('register')}
            onForgotPassword={() => setCurrentView('forgot-password')}
          />
        )}
        
        {currentView === 'register' && (
          <Register
            onClose={handleClose}
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'forgot-password' && (
          <ForgotPassword
            onClose={handleClose}
            onBackToLogin={() => setCurrentView('login')}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal;