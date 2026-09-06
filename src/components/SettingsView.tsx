import React from 'react';
import { Shield, Sliders } from 'lucide-react';
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
    <main id="settings-view-section" className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-stone-200/80">
        <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400">
          Preferences
        </span>
        <h2 className="text-2xl font-serif font-normal text-stone-900 tracking-tight mt-0.5">
          Vault Preferences
        </h2>
        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
          Configure default AI privacy boundaries and editor behaviors.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* Section 1: Default AI Privacy Firewall Scope */}
        <section className="p-6 rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-stone-900 font-serif">Default AI Privacy Firewall Scope</h3>
          </div>
          <p className="text-xs text-stone-500 mb-4 leading-relaxed font-sans">
            Define which journal entries Gemini may access when initiating a new reflection conversation.
          </p>

          <div className="space-y-2.5">
            {[
              {
                id: 'all_vault',
                label: 'Entire Eligible Vault (Default)',
                desc: 'All memories available to Gemini are accessible. Private entries remain strictly excluded.',
              },
              {
                id: 'selected',
                label: 'Specific Thoughts',
                desc: 'Prompt you to pick specific thoughts available to Gemini before starting.',
              },
              {
                id: 'by_label',
                label: 'By Label',
                desc: 'Include eligible memories tagged with selected labels (#tags).',
              },
              {
                id: 'current',
                label: 'Current Thought Only',
                desc: 'Gemini has zero visibility into prior journal entries. Maximum privacy.',
              },
            ].map((option) => (
              <label
                key={option.id}
                id={`pref-scope-${option.id}`}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  preferences.defaultPrivacyScope === option.id
                    ? 'bg-stone-50/80 border-[#121212] ring-1 ring-[#121212]'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/40'
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
                  className="mt-0.5 text-stone-900 focus:ring-stone-400 accent-stone-900"
                />
                <div>
                  <span className="text-xs font-medium text-stone-900 block font-sans">{option.label}</span>
                  <span className="text-[11px] text-stone-500 mt-0.5 block leading-normal font-sans">{option.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 2: Editor Preferences */}
        <section className="p-6 rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700 border border-stone-200/50">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-stone-900 font-serif">Editor Ergonomics</h3>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-stone-100 mt-3">
            <div>
              <span className="text-xs font-medium text-stone-800 block font-sans">Auto-save while typing</span>
              <span className="text-[11px] text-stone-500 block font-sans">Sync journal drafts to Cloud Firestore automatically while writing</span>
            </div>
            <button
              id="btn-toggle-autosave"
              type="button"
              onClick={() => onUpdatePreferences({ autoSaveEnabled: !preferences.autoSaveEnabled })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                preferences.autoSaveEnabled ? 'bg-[#121212]' : 'bg-stone-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  preferences.autoSaveEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
