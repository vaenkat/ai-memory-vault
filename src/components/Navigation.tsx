import React, { useState, useRef, useEffect } from 'react';
import { Plus, Clock, Sparkles, Shield, Settings, LogOut, ShieldCheck } from 'lucide-react';
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isDesktopInside = profileMenuRef.current?.contains(target);
      const isMobileInside = mobileProfileMenuRef.current?.contains(target);
      if (!isDesktopInside && !isMobileInside) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const renderProfileDropdown = (positionClasses: string) => {
    if (!user || !isProfileMenuOpen) return null;

    return (
      <div
        id="user-profile-menu"
        role="dialog"
        aria-label="Account details"
        className={`fixed md:absolute ${positionClasses} w-72 rounded-2xl bg-[#181818] border border-white/12 p-4 shadow-2xl z-50 text-white animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Product Identity */}
        <div className="pb-3 mb-3 border-b border-white/10 select-none">
          <div className="text-xs font-serif font-medium tracking-tight text-white">
            AI Memory Vault
          </div>
          <div className="text-[10px] text-white/50 font-sans mt-0.5">
            Your private reflection space
          </div>
        </div>

        {/* User Identity Header */}
        <div className="flex items-start gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-xs shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-stone-700 border border-white/20 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate font-sans">
              {user.displayName || 'Personal Vault Owner'}
            </div>
            <div className="text-[11px] text-white/60 truncate font-mono mt-0.5" title={user.email || ''}>
              {user.email}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Google Identity · Verified</span>
            </div>
          </div>
        </div>

        {/* Navigation Destinations inside Profile Menu */}
        <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1">
          <button
            type="button"
            id="menu-link-privacy"
            onClick={() => {
              setIsProfileMenuOpen(false);
              onSelectTab('privacy');
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs text-white/85 hover:text-white hover:bg-white/8 flex items-center gap-2.5 transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-white/60" />
            <span>Privacy & Trust</span>
          </button>

          <button
            type="button"
            id="menu-link-settings"
            onClick={() => {
              setIsProfileMenuOpen(false);
              onSelectTab('settings');
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs text-white/85 hover:text-white hover:bg-white/8 flex items-center gap-2.5 transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-white/60" />
            <span>Vault Preferences</span>
          </button>
        </div>

        {/* Sign Out Action */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <button
            type="button"
            id="btn-profile-sign-out"
            onClick={() => {
              setIsProfileMenuOpen(false);
              onSignOut();
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  };
  return (
    <>
      {/* Desktop Left Minimalist Obsidian Sidebar */}
      <aside
        id="desktop-nav"
        className="hidden md:flex w-20 bg-[#121212] flex-col items-center py-7 text-white/50 shrink-0 select-none z-30 min-h-screen border-r border-white/5"
        aria-label="Main Navigation"
      >
        {/* Brand Monogram */}
        <div
          className="text-white font-serif font-bold text-2xl tracking-tighter mb-8 cursor-default select-none transition-transform hover:scale-105"
          title="AI Memory Vault"
        >
          V.
        </div>

        {/* Primary Navigation Links */}
        <div className="flex flex-col gap-6 items-center w-full px-2">
          {/* Today */}
          <button
            id="nav-tab-today"
            onClick={() => onSelectTab('today')}
            className={`relative flex flex-col items-center gap-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-xl py-2.5 px-2 w-full cursor-pointer ${
              currentTab === 'today'
                ? 'bg-white/12 text-white shadow-xs'
                : 'text-white/45 hover:text-white/90 hover:bg-white/5'
            }`}
            title="Today's Journal"
          >
            <Plus className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Today</span>
            {currentTab === 'today' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-white rounded-r-full" />
            )}
          </button>

          {/* Memories */}
          <button
            id="nav-tab-memories"
            onClick={() => onSelectTab('memories')}
            className={`relative flex flex-col items-center gap-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-xl py-2.5 px-2 w-full cursor-pointer ${
              currentTab === 'memories'
                ? 'bg-white/12 text-white shadow-xs'
                : 'text-white/45 hover:text-white/90 hover:bg-white/5'
            }`}
            title="Memory Vault"
          >
            <Clock className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Memories</span>
            {currentTab === 'memories' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-white rounded-r-full" />
            )}
          </button>

          {/* Reflect */}
          <button
            id="nav-tab-reflect"
            onClick={() => onSelectTab('reflect')}
            className={`relative flex flex-col items-center gap-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-xl py-2.5 px-2 w-full cursor-pointer ${
              currentTab === 'reflect'
                ? 'bg-white/12 text-white shadow-xs'
                : 'text-white/45 hover:text-white/90 hover:bg-white/5'
            }`}
            title="Gemini Reflection"
          >
            <Sparkles className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] uppercase tracking-widest font-medium">Reflect</span>
            {currentTab === 'reflect' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-white rounded-r-full" />
            )}
          </button>
        </div>

        {/* Bottom Profile Avatar */}
        <div className="mt-auto flex flex-col items-center pt-4 border-t border-white/10 w-full px-2">
          {user && (
            <div ref={profileMenuRef} className="relative flex flex-col items-center w-full">
              <button
                id="btn-user-avatar-menu"
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-label="Open Account Profile Menu"
                aria-expanded={isProfileMenuOpen}
                className="group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-full transition-transform hover:scale-105 cursor-pointer"
                title={`${user.displayName || user.email} (Click for account)`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User profile'}
                    className="w-8.5 h-8.5 rounded-full border border-white/20 group-hover:border-white/50 object-cover shadow-2xs transition-colors"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-8.5 h-8.5 rounded-full bg-stone-700 border border-white/20 group-hover:border-white/50 flex items-center justify-center text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                {/* Subtle online status indicator */}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#121212]" />
              </button>

              {/* Profile Dropdown Menu */}
              {renderProfileDropdown('left-20 bottom-3')}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Navigation Bar (Clean Dark Theme) */}
      <header
        id="mobile-nav"
        className="md:hidden bg-[#121212] text-white px-3 py-2.5 flex items-center justify-between sticky top-0 z-40 border-b border-white/10"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-serif font-bold text-xl tracking-tighter">V.</span>
          <span className="text-xs font-sans tracking-wide text-white/60">Memory Vault</span>
        </div>

        <nav className="flex items-center gap-1.5" aria-label="Mobile Navigation">
          <button
            onClick={() => onSelectTab('today')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-medium transition-colors cursor-pointer ${
              currentTab === 'today' ? 'bg-white/15 text-white font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onSelectTab('memories')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-medium transition-colors cursor-pointer ${
              currentTab === 'memories' ? 'bg-white/15 text-white font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            Memories
          </button>
          <button
            onClick={() => onSelectTab('reflect')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-medium transition-colors cursor-pointer ${
              currentTab === 'reflect' ? 'bg-white/15 text-white font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            Reflect
          </button>

          {/* Mobile Profile Avatar Trigger */}
          {user && (
            <div ref={mobileProfileMenuRef} className="relative flex items-center">
              <button
                id="btn-mobile-avatar-menu"
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-label="Open Account Profile Menu"
                aria-expanded={isProfileMenuOpen}
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ml-1 cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-stone-700 flex items-center justify-center text-white text-xs font-semibold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Mobile Profile Dropdown */}
              {renderProfileDropdown('right-3 top-13')}
            </div>
          )}
        </nav>
      </header>
    </>
  );
};

