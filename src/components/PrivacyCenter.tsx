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
      md += `*Date:* ${new Date(e.createdAt).toLocaleDateString()} | *Mood:* ${e.mood || 'N/A'} | *Privacy:* ${e.isGeminiPrivate ? '🔒 Private (AI Excluded)' : 'AI Eligible'}\n`;
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
    <main id="privacy-center-section" className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-stone-200">
        <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
          Security & Governance Architecture
        </span>
        <h2 className="text-2xl font-serif text-stone-900 tracking-tight mt-0.5">
          Privacy & Trust Center
        </h2>
        <p className="text-xs text-stone-600 mt-1 max-w-xl">
          The AI Memory Vault is built under a strict zero-trust model. You own your data completely, and private memories are architecturally quarantined from AI models.
        </p>
      </div>

      {/* Security Architecture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Card 1: AI Privacy Firewall */}
        <div id="security-card-firewall" className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">AI Privacy Firewall</h3>
              <span className="text-[10px] font-mono text-emerald-700 uppercase">Dual-Layer Enforcement</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            By default, Gemini only receives the current open conversation. Any entry marked with{' '}
            <strong className="text-stone-800">🔒 Private</strong> is filtered out in both frontend code and server-side request pipelines, even during broad vault reflection.
          </p>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-mono">Quarantined Entries:</span>
            <span className="font-semibold text-amber-800">{privateCount} private memories</span>
          </div>
        </div>

        {/* Card 2: Database Isolation */}
        <div id="security-card-firestore" className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-lg bg-stone-100 text-stone-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Firestore Isolation</h3>
              <span className="text-[10px] font-mono text-stone-600 uppercase">Owner-Bound Paths</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            All data is partitioned under <code className="text-[11px] font-mono bg-stone-100 px-1 py-0.5 rounded">/users/{'{userId}'}/...</code>. Cloud Firestore security rules strictly mandate <code className="text-[11px] font-mono bg-stone-100 px-1 py-0.5 rounded">request.auth.uid == userId</code> with global default-deny.
          </p>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-mono">Current User UID:</span>
            <span className="font-mono text-[11px] text-stone-700 truncate max-w-[180px]">{user?.uid || 'Not signed in'}</span>
          </div>
        </div>

        {/* Card 3: Federated Identity */}
        <div id="security-card-auth" className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-lg bg-stone-100 text-stone-800">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Federated Identity</h3>
              <span className="text-[10px] font-mono text-stone-600 uppercase">Google Sign-In Only</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            No passwords are ever handled, hashed, or stored by this application. Authentication is handled exclusively through Firebase Authentication with Google Sign-In popups.
          </p>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-mono">Identity Provider:</span>
            <span className="text-stone-800 font-medium">Google Accounts</span>
          </div>
        </div>

        {/* Card 4: Secret Management */}
        <div id="security-card-secrets" className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-lg bg-stone-100 text-stone-800">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Secret Management</h3>
              <span className="text-[10px] font-mono text-stone-600 uppercase">Zero-Hardcoding Standard</span>
            </div>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            API keys are kept strictly on the backend Express proxy server via Google Cloud Secret Manager. Browser bundles contain zero AI credentials or access secrets.
          </p>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-mono">Client Key Leakage Risk:</span>
            <span className="text-emerald-700 font-medium">0% (Proxied via /api/*)</span>
          </div>
        </div>
      </div>

      {/* Data Portability & Ownership Controls */}
      <section id="data-governance-section" className="mt-8 p-5 rounded-xl border border-stone-200 bg-stone-50/60">
        <h3 className="text-sm font-semibold text-stone-900">Data Ownership & Portability</h3>
        <p className="text-xs text-stone-600 mt-1">
          You have full rights to your reflections. Export your complete journal archive at any time or securely wipe all data.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            id="btn-export-json"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 shadow-2xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export Archive (JSON)</span>
          </button>

          <button
            id="btn-export-md"
            onClick={handleExportMarkdown}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 shadow-2xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
          >
            <FileText className="w-3.5 h-3.5 text-stone-600" />
            <span>Export as Markdown</span>
          </button>

          <button
            id="btn-wipe-data"
            onClick={() => setShowConfirmModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 shadow-2xs flex items-center gap-1.5 ml-auto focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
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
            <h4 className="text-base font-semibold text-stone-900">Permanently Wipe All Data?</h4>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              This action will permanently delete all {entries.length} journal entries and all reflection conversations from Cloud Firestore. This cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                id="btn-cancel-wipe"
                onClick={() => setShowConfirmModal(false)}
                disabled={isWiping}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 hover:bg-stone-100 text-stone-700"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-wipe"
                onClick={handleConfirmWipe}
                disabled={isWiping}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
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
