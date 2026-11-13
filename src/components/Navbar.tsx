import React from 'react';
import { Cpu, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, authLoading, scans, signInWithGoogle, signOutUser } = useAuth();

  const navItems = [
    { id: 'studio', label: 'Scanner' },
    { id: 'history', label: user ? `Saved Scans (${scans.length})` : 'Saved Scans' },
    { id: 'cloud-apis', label: 'Cloud APIs' },
    { id: 'lab', label: 'Model Lab' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          onClick={() => setActiveTab('studio')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white group-hover:bg-indigo-500 transition-colors">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white font-sans">
            Digit AIpro
          </span>
        </button>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'text-white bg-slate-800/90'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action (Google Sign-In / Account Sign-Out) */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              onClick={() => void signOutUser()}
              disabled={authLoading}
              title={`Signed in as ${user.email || user.displayName}`}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span className="max-w-[120px] truncate">{user.displayName?.split(' ')[0] || 'Account'}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              onClick={() => void signInWithGoogle()}
              disabled={authLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Row */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto pt-2 pb-0.5 no-scrollbar border-t border-slate-900 mt-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
              activeTab === item.id
                ? 'text-indigo-400 bg-indigo-950/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
