import React, { useState } from 'react';
import { Shield, Lock, Sparkles, Database, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthLandingProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  authError: string | null;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({
  onSignIn,
  isLoading,
  authError,
}) => {
  return (
    <div id="auth-landing-page" className="min-h-screen bg-stone-100/60 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-lg font-semibold shadow-xs">
            G
          </div>
          <div>
            <h1 className="text-base font-semibold text-stone-900 tracking-tight leading-none">
              Gemini Journal
            </h1>
            <span className="text-xs text-stone-500 font-mono">
              AI Memory Vault
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Zero-Trust Architecture</span>
        </div>
      </header>

      {/* Main Hero & Sign-In Block */}
      <main className="max-w-xl mx-auto w-full px-6 py-12 text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2 block">
          Private Journaling · AI Memory Vault
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight font-normal leading-tight">
          A quiet, private sanctuary for reflection, powered by Gemini.
        </h2>
        <p className="mt-4 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
          Write daily reflections, converse with an empathetic AI companion, and preserve life memories protected by an active AI Privacy Firewall.
        </p>

        {/* Sign In Button Card */}
        <div className="mt-8 p-6 rounded-2xl bg-white border border-stone-200/90 shadow-sm max-w-sm mx-auto">
          <button
            id="btn-google-sign-in"
            type="button"
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-medium transition-all shadow-2xs flex items-center justify-center gap-3 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
          >
            {/* Clean SVG Google logo */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Connecting securely...' : 'Sign in with Google'}</span>
          </button>

          {authError && (
            <p className="mt-3 text-xs text-rose-600 leading-normal">
              {authError}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-center gap-1.5 font-mono">
            <Lock className="w-3 h-3 text-stone-400" />
            <span>Firebase Federated Google Identity</span>
          </div>
        </div>

        {/* Security Assurances Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/80">
            <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 mb-2">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-stone-900">AI Privacy Firewall</h3>
            <p className="text-[11px] text-stone-600 mt-1 leading-normal">
              Private entries are barred from Gemini by both client code and backend logic.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/80">
            <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 mb-2">
              <Database className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-stone-900">Database Isolation</h3>
            <p className="text-[11px] text-stone-600 mt-1 leading-normal">
              Firestore security rules restrict all read and write queries to your unique UID.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/80">
            <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-stone-900">Model Resilience</h3>
            <p className="text-[11px] text-stone-600 mt-1 leading-normal">
              Automated 4-model fallback ladder with zero API keys exposed in the browser.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full px-6 py-6 text-center text-xs text-stone-400 border-t border-stone-200">
        Personal Gemini Journal · AI Memory Vault · Production Ideathon Architecture
      </footer>
    </div>
  );
};
