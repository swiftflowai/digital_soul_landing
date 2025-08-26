import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Twitter, Facebook, Instagram } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const navigate = useNavigate();

  const links = {
    company: [
      { name: 'About', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Blog', href: '#' }
    ],
    support: [
      { name: 'Help Center', href: '/faq', isRoute: true },
      { name: 'Contact Us', href: 'mailto:contact@digitalsoulapp.ch' },
      { name: 'Send Feedback', href: '#feedback' },
      { name: 'Community', href: '#' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy-policy', isRoute: true },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
      { name: 'Data Protection', href: '#' }
    ]
  };

  const socialLinks = [
    { icon: <Twitter className="w-5 h-5" />, href: '#', label: 'Twitter' },
    { icon: <Facebook className="w-5 h-5" />, href: '#', label: 'Facebook' },
    { icon: <Instagram className="w-5 h-5" />, href: '#', label: 'Instagram' },
    { icon: <Mail className="w-5 h-5" />, href: 'mailto:contact@digitalsoulapp.ch', label: 'Email' }
  ];

  const handleLinkClick = (href: string, isRoute?: boolean) => {
    if (isRoute) {
      navigate(href);
    } else if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (href.startsWith('mailto:')) {
      window.location.href = href;
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-2">
            <Logo className="w-10 h-10" textClassName="text-2xl text-white" />
            <p className="text-gray-400 leading-relaxed mb-6 max-w-md mt-4">
              Preserving memories, voices, and stories for generations to come. 
              Create your digital legacy with ethical AI technology.
            </p>
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">Get in touch:</p>
              <a 
                href="mailto:contact@digitalsoulapp.ch"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                contact@digitalsoulapp.ch
              </a>
            </div>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  onClick={(e) => {
                    if (social.href.startsWith('mailto:')) {
                      e.preventDefault();
                      window.location.href = social.href;
                    }
                  }}
                  aria-label={social.label}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links sections */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3">
              {links.company.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-3">
              {links.support.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleLinkClick(link.href, link.isRoute)}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              {links.legal.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleLinkClick(link.href, link.isRoute)}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2025 Digital Soul. Built with love and ethical AI.
          </p>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <span className="text-gray-400 text-sm">Made with</span>
            <div className="w-4 h-4 text-red-500">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span className="text-gray-400 text-sm">for preserving memories</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;