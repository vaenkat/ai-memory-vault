import React, { useState } from 'react';
import { Search, Lock, Unlock, Sparkles, Trash2, Edit3, Tag, Calendar, Filter, Lightbulb, RefreshCw } from 'lucide-react';
import { JournalEntry, ThemeInsight } from '../types';

interface MemoriesVaultProps {
  entries: JournalEntry[];
  onSelectEntryToEdit: (entry: JournalEntry) => void;
  onSelectEntryToReflect: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => Promise<void>;
  onAnalyzeThemes: () => Promise<void>;
  themes: ThemeInsight[];
  isAnalyzingThemes: boolean;
}

export const MemoriesVault: React.FC<MemoriesVaultProps> = ({
  entries,
  onSelectEntryToEdit,
  onSelectEntryToReflect,
  onDeleteEntry,
  onAnalyzeThemes,
  themes,
  isAnalyzingThemes,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'eligible' | 'private'>('all');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    // Privacy filter
    if (privacyFilter === 'eligible' && entry.isGeminiPrivate) return false;
    if (privacyFilter === 'private' && !entry.isGeminiPrivate) return false;

    // Theme filter if selected
    if (selectedThemeId) {
      const activeTheme = themes.find((t) => t.name === selectedThemeId);
      if (activeTheme && activeTheme.relatedEntryIds?.length > 0) {
        if (!activeTheme.relatedEntryIds.includes(entry.id)) return false;
      }
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesTitle = entry.title.toLowerCase().includes(query);
    const matchesContent = entry.content.toLowerCase().includes(query);
    const matchesTags = (entry.tags || []).some((t) => t.toLowerCase().includes(query));
    return matchesTitle || matchesContent || matchesTags;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this memory? This action cannot be undone.')) {
      setDeletingId(id);
      try {
        await onDeleteEntry(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const eligibleCount = entries.filter((e) => !e.isGeminiPrivate).length;
  const privateCount = entries.filter((e) => e.isGeminiPrivate).length;

  return (
    <main id="memories-vault-section" className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
            Historical Vault ({entries.length} memories)
          </span>
          <h2 className="text-2xl font-serif text-stone-900 tracking-tight mt-0.5">
            Memory Vault
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            {eligibleCount} AI-eligible memories · {privateCount} strictly 🔒 private memories
          </p>
        </div>

        {/* Action: Trigger Theme Analysis */}
        <button
          id="btn-analyze-themes"
          onClick={onAnalyzeThemes}
          disabled={isAnalyzingThemes || eligibleCount < 2}
          title={
            eligibleCount < 2
              ? 'At least 2 eligible memories are needed for theme synthesis'
              : 'Discover grounded recurring themes across eligible memories'
          }
          className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none ${
            eligibleCount < 2
              ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
              : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50 shadow-xs'
          }`}
        >
          {isAnalyzingThemes ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{isAnalyzingThemes ? 'Synthesizing...' : 'Discover Recurring Themes'}</span>
        </button>
      </div>

      {/* Grounded Recurring Themes Panel */}
      {themes.length > 0 && (
        <section id="recurring-themes-panel" className="mt-6 p-4 rounded-xl bg-stone-100/70 border border-stone-200/80">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-stone-700" />
              <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                Recurring Life Themes (Evidence-Backed)
              </h3>
            </div>
            {selectedThemeId && (
              <button
                id="btn-clear-theme-filter"
                onClick={() => setSelectedThemeId(null)}
                className="text-[11px] text-stone-500 hover:text-stone-900 underline"
              >
                Clear Theme Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {themes.map((theme, i) => (
              <div
                key={i}
                id={`theme-card-${i}`}
                onClick={() =>
                  setSelectedThemeId(selectedThemeId === theme.name ? null : theme.name)
                }
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedThemeId === theme.name
                    ? 'bg-white border-stone-900 shadow-2xs ring-1 ring-stone-900'
                    : 'bg-white/80 border-stone-200 hover:border-stone-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-900">{theme.name}</span>
                  {selectedThemeId === theme.name && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-stone-100">
                      FILTERED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 mt-1 leading-normal">{theme.description}</p>
                <p className="text-[10px] text-stone-500 font-mono mt-2 flex items-center gap-1">
                  <span>↳</span>
                  <span>{theme.evidence}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Bar */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="memories-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries by title, text, or #tag..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-stone-200 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400/20 transition-all"
          />
        </div>

        {/* Privacy filter buttons */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0" aria-label="Privacy Filter">
          <button
            id="filter-all-btn"
            onClick={() => setPrivacyFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              privacyFilter === 'all'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            id="filter-eligible-btn"
            onClick={() => setPrivacyFilter('eligible')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              privacyFilter === 'eligible'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            AI Eligible ({eligibleCount})
          </button>
          <button
            id="filter-private-btn"
            onClick={() => setPrivacyFilter('private')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              privacyFilter === 'private'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🔒 Private ({privateCount})
          </button>
        </div>
      </div>

      {/* Memories List */}
      <div id="memories-list-container" className="mt-6 space-y-3">
        {filteredEntries.length === 0 ? (
          <div
            id="empty-memories-card"
            className="text-center py-16 px-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50"
          >
            <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-stone-900">
              {entries.length === 0
                ? 'No memories in this vault yet.'
                : 'No memories match your current filters.'}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {entries.length === 0
                ? "Capture your reflections in the Today view. Each entry builds your personal AI memory vault."
                : "Try resetting your search query or selecting a different privacy filter."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <article
              key={entry.id}
              id={`memory-card-${entry.id}`}
              className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-stone-500 mb-1">
                    <span className="font-mono text-[11px]">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {entry.mood && (
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px]">
                        {entry.mood}
                      </span>
                    )}
                    {entry.isGeminiPrivate ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Private</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        <span>AI Eligible</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-serif font-medium text-stone-900">
                    {entry.title || 'Untitled Entry'}
                  </h3>

                  <p className="text-xs text-stone-600 mt-2 font-serif leading-relaxed line-clamp-3">
                    {entry.content}
                  </p>

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <button
                    id={`btn-edit-memory-${entry.id}`}
                    onClick={() => onSelectEntryToEdit(entry)}
                    title="Edit entry"
                    aria-label={`Edit entry titled ${entry.title}`}
                    className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-reflect-memory-${entry.id}`}
                    onClick={() => onSelectEntryToReflect(entry)}
                    disabled={entry.isGeminiPrivate}
                    title={
                      entry.isGeminiPrivate
                        ? 'This entry is private. Excluded from Gemini reflection.'
                        : 'Reflect on this memory with Gemini'
                    }
                    aria-label={`Reflect with Gemini on ${entry.title}`}
                    className={`p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none ${
                      entry.isGeminiPrivate
                        ? 'text-stone-300 cursor-not-allowed'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-delete-memory-${entry.id}`}
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete entry"
                    aria-label={`Delete entry titled ${entry.title}`}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
                  >
                    {deletingId === entry.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
};
