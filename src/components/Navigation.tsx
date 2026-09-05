import React from 'react';
import { Plus, Clock, Sparkles, Shield, Settings, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';
import { PrivacyScope } from '../types';

export type TabType = 'today' | 'memories' | 'reflect' | 'privacy' | 'settings';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: User | null;
  onSignOut: () => void;
  privacyScope: PrivacyScope;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  user,
  onSignOut,
}) => {
  return (
    <>
      {/* Desktop Left Minimalist Obsidian Sidebar */}
      <aside
        id="desktop-nav"
        className="hidden md:flex w-20 bg-[#121212] flex-col items-center py-8 gap-10 text-white/50 shrink-0 select-none z-30 min-h-screen"
        aria-label="Main Navigation"
      >
        {/* Brand Monogram */}
        <div className="text-white font-bold text-2xl tracking-tighter mb-2 font-serif cursor-default">
          V.
        </div>

        {/* Primary Navigation Links */}
        <div className="flex flex-col gap-8 items-center w-full">
          {/* Today */}
          <button
            id="nav-tab-today"
            onClick={() => onSelectTab('today')}
            className={`flex flex-col items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg p-1 w-full ${
              currentTab === 'today' ? 'text-white' : 'text-white/50 hover:text-white'
            }`}
            title="Today's Journal"
          >
            <Plus className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Today</span>
          </button>

          {/* Memories */}
          <button
            id="nav-tab-memories"
            onClick={() => onSelectTab('memories')}
            className={`flex flex-col items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg p-1 w-full ${
              currentTab === 'memories' ? 'text-white' : 'text-white/50 hover:text-white'
            }`}
            title="Memory Vault"
          >
            <Clock className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Memories</span>
          </button>

          {/* Reflect */}
          <button
            id="nav-tab-reflect"
            onClick={() => onSelectTab('reflect')}
            className={`flex flex-col items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg p-1 w-full ${
              currentTab === 'reflect' ? 'text-white' : 'text-white/50 hover:text-white'
            }`}
            title="Gemini Reflection"
          >
            <Sparkles className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Reflect</span>
          </button>

          {/* Privacy */}
          <button
            id="nav-tab-privacy"
            onClick={() => onSelectTab('privacy')}
            className={`flex flex-col items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg p-1 w-full ${
              currentTab === 'privacy' ? 'text-white' : 'text-white/50 hover:text-white'
            }`}
            title="Privacy & Security Center"
          >
            <Shield className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Privacy</span>
          </button>
        </div>

        {/* Bottom Actions: Settings & Account */}
        <div className="mt-auto flex flex-col items-center gap-5 pt-4 border-t border-white/10 w-full px-2">
          {/* Settings Tab */}
          <button
            id="nav-tab-settings"
            onClick={() => onSelectTab('settings')}
            className={`flex flex-col items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg p-1 ${
              currentTab === 'settings' ? 'text-white' : 'text-white/50 hover:text-white'
            }`}
            title="Vault Preferences"
          >
            <Settings className="w-4 h-4" strokeWidth={1.75} />
            <span className="text-[9px] uppercase tracking-widest font-medium">Config</span>
          </button>

          {/* User Avatar */}
          {user && (
            <div className="flex flex-col items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-white/20 object-cover"
                  referrerPolicy="no-referrer"
                  title={user.email || 'User'}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-stone-600 to-stone-400 border border-white/20 flex items-center justify-center text-white text-xs font-semibold"
                  title={user.email || 'User'}
                >
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}

              {/* Sign Out Button */}
              <button
                id="btn-sign-out"
                onClick={onSignOut}
                aria-label="Sign out of account"
                title="Sign out"
                className="text-white/40 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Navigation Bar (Clean Dark Theme) */}
      <header
        id="mobile-nav"
        className="md:hidden bg-[#121212] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-white/10"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-serif font-bold text-xl tracking-tighter">V.</span>
          <span className="text-xs font-sans tracking-wide text-white/60">Memory Vault</span>
        </div>

        <nav className="flex items-center gap-2" aria-label="Mobile Navigation">
          <button
            onClick={() => onSelectTab('today')}
            className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-medium ${
              currentTab === 'today' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onSelectTab('memories')}
            className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-medium ${
              currentTab === 'memories' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Memories
          </button>
          <button
            onClick={() => onSelectTab('reflect')}
            className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-medium ${
              currentTab === 'reflect' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Reflect
          </button>
          <button
            onClick={() => onSelectTab('privacy')}
            className={`px-2 py-1 rounded text-[11px] uppercase tracking-wider font-medium ${
              currentTab === 'privacy' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`p-1.5 rounded text-white/50 hover:text-white ${
              currentTab === 'settings' ? 'text-white' : ''
            }`}
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {user && (
            <button
              onClick={onSignOut}
              className="p-1.5 text-white/40 hover:text-white"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </nav>
      </header>
    </>
  );
};

