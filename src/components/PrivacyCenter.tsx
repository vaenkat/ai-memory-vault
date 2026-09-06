import React, { useState } from 'react';
import { ShieldCheck, Lock, Database, Key, Download, Trash2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { User } from 'firebase/auth';
import { JournalEntry, Conversation } from '../types';

interface PrivacyCenterProps {
  user: User | null;
  entries: JournalEntry[];
  conversations: Conversation[];
  onWipeData: () => Promise<void>;
}

export const PrivacyCenter: React.FC<PrivacyCenterProps> = ({
  user,
  entries,
  conversations,
  onWipeData,
}) => {
  const [isWiping, setIsWiping] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const eligibleCount = entries.filter((e) => !e.isGeminiPrivate).length;
  const privateCount = entries.filter((e) => e.isGeminiPrivate).length;

  const handleExportJson = () => {
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      user: {
        uid: user?.uid,
        email: user?.email,
      },
      stats: {
        totalEntries: entries.length,
        eligibleEntries: eligibleCount,
        privateEntries: privateCount,
        conversations: conversations.length,
      },
      entries,
      conversations,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-memory-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = `# Personal Gemini Journal & AI Memory Vault Export\n`;
    md += `*Exported on ${new Date().toLocaleString()} for ${user?.email || 'User'}*\n\n---\n\n`;

    entries.forEach((e) => {
      md += `## ${e.title || 'Untitled Entry'}\n`;
      md += `*Date:* ${new Date(e.createdAt).toLocaleDateString()} | *Mood:* ${e.mood || 'N/A'} | *Privacy:* ${e.isGeminiPrivate ? '🔒 Private' : 'Available to Gemini'}\n`;
      if (e.tags && e.tags.length > 0) {
        md += `*Tags:* ${e.tags.map((t) => `#${t}`).join(' ')}\n`;
      }
      md += `\n${e.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-journal-export-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmWipe = async () => {
    setIsWiping(true);
    try {
      await onWipeData();
      setShowConfirmModal(false);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <main id="privacy-center-section" className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-stone-200/80">
        <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400">
          Security & Architecture
        </span>
        <h2 className="text-2xl font-serif font-normal text-stone-900 tracking-tight mt-0.5">
          Privacy & Trust Center
        </h2>
        <p className="text-xs text-stone-500 mt-1.5 max-w-xl leading-relaxed">
          The AI Memory Vault is engineered under a strict zero-trust model. You own your reflections unconditionally, and private entries are quarantined from all AI reasoning.
        </p>
      </div>

      {/* Security Architecture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Card 1: AI Privacy Firewall */}
        <div id="security-card-firewall" className="p-5 rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 font-serif">AI Privacy Firewall</h3>
              <span className="text-[9px] font-mono text-emerald-700 uppercase tracking-wider">Dual-Layer Enforcement</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed font-sans">
            By default, Gemini only receives the current open conversation. Any entry marked with{' '}
            <strong className="text-stone-800">🔒 Private</strong> is filtered out in both client state and server-side request pipelines, even during broad vault reflection.
          </p>
          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
            <span className="text-stone-400 text-[11px]">Quarantined Memories:</span>
            <span className="text-amber-800 font-medium text-[11px]">{privateCount} private</span>
          </div>
        </div>

        {/* Card 2: Database Isolation */}
        <div id="security-card-firestore" className="p-5 rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200/60">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 font-serif">Firestore Isolation</h3>
              <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Owner-Bound Paths</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed font-sans">
            All data is partitioned under <code className="text-[11px] font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/50">/users/{'{userId}'}/...</code>. Cloud Firestore security rules strictly enforce <code className="text-[11px] font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/50">request.auth.uid == userId</code> with global default-deny.
          </p>
          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
            <span className="text-stone-400 text-[11px]">User UID:</span>
            <span className="text-[11px] text-stone-600 truncate max-w-[170px]">{user?.uid || 'Unauthenticated'}</span>
          </div>
        </div>

        {/* Card 3: Federated Identity */}
        <div id="security-card-auth" className="p-5 rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200/60">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 font-serif">Federated Identity</h3>
              <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Google Accounts</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed font-sans">
            No passwords are ever accepted, stored, or processed by this application. Authentication is handled exclusively through Firebase Authentication via Google Sign-In.
          </p>
          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
            <span className="text-stone-400 text-[11px]">Provider:</span>
            <span className="text-stone-700 font-medium text-[11px]">Google Identity</span>
          </div>
        </div>

        {/* Card 4: Secret Management */}
        <div id="security-card-secrets" className="p-5 rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200/60">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 font-serif">Secret Management</h3>
              <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Zero-Hardcoding</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed font-sans">
            API keys are kept strictly on the backend Express proxy server via Google Cloud Secret Manager. Browser client bundles contain zero AI credentials or access secrets.
          </p>
          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
            <span className="text-stone-400 text-[11px]">Client Key Exposure:</span>
            <span className="text-emerald-700 font-medium text-[11px]">0% (Proxied via /api/*)</span>
          </div>
        </div>
      </div>

      {/* Data Portability & Ownership Controls */}
      <section id="data-governance-section" className="mt-8 p-5 rounded-2xl border border-stone-200/80 bg-stone-50/70">
        <h3 className="text-sm font-semibold text-stone-900 font-serif">Data Ownership & Portability</h3>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
          You have full sovereignty over your memories. Export your complete journal archive at any time, or securely wipe all data from the database.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5 items-center">
          <button
            id="btn-export-json"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-stone-300/80 text-stone-800 hover:bg-stone-50 shadow-2xs flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none transition-all"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export Archive (JSON)</span>
          </button>

          <button
            id="btn-export-md"
            onClick={handleExportMarkdown}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-stone-300/80 text-stone-800 hover:bg-stone-50 shadow-2xs flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-stone-600" />
            <span>Export as Markdown</span>
          </button>

          <button
            id="btn-wipe-data"
            onClick={() => setShowConfirmModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 shadow-2xs flex items-center gap-2 ml-auto focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe All Data</span>
          </button>
        </div>
      </section>

      {/* Confirmation Modal for Wiping Data */}
      {showConfirmModal && (
        <div
          id="wipe-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-stone-900 font-serif">Permanently Wipe All Data?</h4>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              This action will permanently delete all {entries.length} journal entries and all reflection conversations from Cloud Firestore. This cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                id="btn-cancel-wipe"
                onClick={() => setShowConfirmModal(false)}
                disabled={isWiping}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-wipe"
                onClick={handleConfirmWipe}
                disabled={isWiping}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
              >
                {isWiping ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
