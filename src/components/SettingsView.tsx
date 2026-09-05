import React from 'react';
import { Settings, Shield, Sliders, Server, ExternalLink, Terminal } from 'lucide-react';
import { PrivacyScope, UserPreferences } from '../types';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onUpdatePreferences,
}) => {
  return (
    <main id="settings-view-section" className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-stone-200">
        <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
          Preferences & Runtime Configuration
        </span>
        <h2 className="text-2xl font-serif text-stone-900 tracking-tight mt-0.5">
          Application Settings
        </h2>
        <p className="text-xs text-stone-600 mt-1">
          Customize default privacy scopes, editor behaviors, and inspect production deployment architecture.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* Section 1: Default AI Privacy Firewall Configuration */}
        <section className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-semibold text-stone-900">Default AI Privacy Firewall Scope</h3>
          </div>
          <p className="text-xs text-stone-600 mb-4">
            Choose what journal context is shared by default whenever you begin a new reflection session with Gemini.
          </p>

          <div className="space-y-2">
            {[
              {
                id: 'current',
                label: 'Current entry only (Strict Isolation - Recommended)',
                desc: 'Gemini has zero visibility into prior journal entries. Maximum privacy.',
              },
              {
                id: 'selected',
                label: 'Selected memories only',
                desc: 'Prompt you to manually pick eligible past entries before conversation starts.',
              },
              {
                id: 'date_range',
                label: 'Last 30 days',
                desc: 'Include eligible entries from the past month for contextual continuity.',
              },
              {
                id: 'all_vault',
                label: 'Entire Memory Vault',
                desc: 'All non-private entries eligible. 🔒 Private entries remain completely excluded.',
              },
            ].map((option) => (
              <label
                key={option.id}
                id={`pref-scope-${option.id}`}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  preferences.defaultPrivacyScope === option.id
                    ? 'bg-stone-50 border-stone-800 ring-1 ring-stone-800'
                    : 'bg-white border-stone-200 hover:bg-stone-50/60'
                }`}
              >
                <input
                  type="radio"
                  name="defaultPrivacyScope"
                  value={option.id}
                  checked={preferences.defaultPrivacyScope === option.id}
                  onChange={() =>
                    onUpdatePreferences({ defaultPrivacyScope: option.id as PrivacyScope })
                  }
                  className="mt-1 text-stone-900 focus:ring-stone-500"
                />
                <div>
                  <span className="text-xs font-medium text-stone-900 block">{option.label}</span>
                  <span className="text-[11px] text-stone-500 mt-0.5 block">{option.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 2: Editor Preferences */}
        <section className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-semibold text-stone-900">Editor Ergonomics</h3>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-stone-100">
            <div>
              <span className="text-xs font-medium text-stone-800 block">Auto-save while typing</span>
              <span className="text-[11px] text-stone-500 block">Automatically sync drafts to Firestore while working</span>
            </div>
            <button
              id="btn-toggle-autosave"
              type="button"
              onClick={() => onUpdatePreferences({ autoSaveEnabled: !preferences.autoSaveEnabled })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
                preferences.autoSaveEnabled ? 'bg-stone-900' : 'bg-stone-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  preferences.autoSaveEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Section 3: Cloud Run Deployment & Campaign Verification */}
        <section className="p-5 rounded-xl border border-stone-200 bg-stone-50/60 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-semibold text-stone-900">Cloud Run & Campaign Verification</h3>
          </div>
          <p className="text-xs text-stone-600 mb-3 leading-relaxed">
            This application is configured for production deployment on Google Cloud Run with automated challenge verification.
          </p>

          <div className="bg-stone-900 text-stone-200 rounded-lg p-3 text-xs font-mono overflow-x-auto space-y-1">
            <div className="text-stone-400"># Verification resource label binding:</div>
            <div className="text-emerald-400">gcloud run services update personal-gemini-journal \</div>
            <div className="text-emerald-400 pl-4">--update-labels=dev-tutorial=cloud-run-ai-challenge \</div>
            <div className="text-emerald-400 pl-4">--region=asia-east1</div>
          </div>
        </section>
      </div>
    </main>
  );
};
