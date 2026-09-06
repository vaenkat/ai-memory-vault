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
  onTogglePrivacy?: (entry: JournalEntry) => Promise<void> | void;
}

export const MemoriesVault: React.FC<MemoriesVaultProps> = ({
  entries,
  onSelectEntryToEdit,
  onSelectEntryToReflect,
  onDeleteEntry,
  onAnalyzeThemes,
  themes,
  isAnalyzingThemes,
  onTogglePrivacy,
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
    <main id="memories-vault-section" className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400">
            Archival Index · {entries.length} memories
          </span>
          <h2 className="text-2xl font-serif font-normal text-stone-900 tracking-tight mt-0.5">
            Memory Vault
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-sans">
            <span className="font-mono text-stone-700">{eligibleCount}</span> available to Gemini · <span className="font-mono text-stone-700">{privateCount}</span> private
          </p>
        </div>

        {/* Action: Trigger Theme Analysis */}
        <button
          id="btn-analyze-themes"
          onClick={onAnalyzeThemes}
          disabled={isAnalyzingThemes || eligibleCount < 2}
          title={
            eligibleCount < 2
              ? 'At least 2 memories available to Gemini are needed for theme synthesis'
              : 'Discover grounded recurring themes across memories available to Gemini'
          }
          className={`px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none ${
            eligibleCount < 2
              ? 'border-stone-200 bg-stone-100/70 text-stone-400 cursor-not-allowed'
              : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50 shadow-2xs hover:shadow-xs'
          }`}
        >
          {isAnalyzingThemes ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-600" />
          ) : (
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{isAnalyzingThemes ? 'Synthesizing Patterns...' : 'Discover Recurring Themes'}</span>
        </button>
      </div>

      {/* Grounded Recurring Themes Panel */}
      {themes.length > 0 && (
        <section id="recurring-themes-panel" className="mt-6 p-5 rounded-2xl bg-stone-100/70 border border-stone-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-stone-700" strokeWidth={1.5} />
              <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider font-mono">
                Recurring Life Themes (Evidence-Backed)
              </h3>
              {themes.some((t) => t.isFallback) ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  ⚡ Degraded Mode: Offline Local Fallback
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Live Gemini Synthesis
                </span>
              )}
            </div>
            {selectedThemeId && (
              <button
                id="btn-clear-theme-filter"
                onClick={() => setSelectedThemeId(null)}
                className="text-[11px] text-stone-500 hover:text-stone-900 underline font-mono"
              >
                Clear Theme Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {themes.map((theme, i) => (
              <div
                key={i}
                id={`theme-card-${i}`}
                onClick={() =>
                  setSelectedThemeId(selectedThemeId === theme.name ? null : theme.name)
                }
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedThemeId === theme.name
                    ? 'bg-white border-[#121212] shadow-xs ring-1 ring-[#121212]'
                    : 'bg-white/90 border-stone-200 hover:border-stone-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-900 font-serif">{theme.name}</span>
                  {selectedThemeId === theme.name && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#121212] text-stone-100">
                      FILTERED
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed font-sans">{theme.description}</p>
                <p className="text-[10px] text-stone-500 font-mono mt-2 flex items-center gap-1.5 pt-2 border-t border-stone-100">
                  <span className="text-stone-400">↳ Evidence:</span>
                  <span className="italic truncate">{theme.evidence}</span>
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
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="memories-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries by title, thoughts, or #tags..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-stone-200 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400/20 transition-all font-sans"
          />
        </div>

        {/* Memories Filter */}
        <div className="flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl shrink-0 border border-stone-200/50" aria-label="Memories Filter">
          <span className="text-[11px] font-sans text-stone-500 pl-2 pr-1 select-none font-medium">Show:</span>
          <button
            id="filter-all-btn"
            type="button"
            onClick={() => setPrivacyFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              privacyFilter === 'all'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Thoughts ({entries.length})
          </button>
          <button
            id="filter-eligible-btn"
            type="button"
            onClick={() => setPrivacyFilter('eligible')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              privacyFilter === 'eligible'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Available to Gemini ({eligibleCount})
          </button>
          <button
            id="filter-private-btn"
            type="button"
            onClick={() => setPrivacyFilter('private')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              privacyFilter === 'private'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Private ({privateCount})
          </button>
        </div>
      </div>

      {/* Memories List */}
      <div id="memories-list-container" className="mt-6 space-y-3.5">
        {filteredEntries.length === 0 ? (
          <div
            id="empty-memories-card"
            className="text-center py-16 px-4 rounded-2xl border border-dashed border-stone-200 bg-white/50"
          >
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto mb-3 border border-stone-200">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-serif font-medium text-stone-900">
              {entries.length === 0
                ? 'No memories in this vault yet.'
                : 'No memories match your search criteria.'}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {entries.length === 0
                ? "Capture your reflections in the Today view. Each entry builds your personal, private AI memory vault."
                : "Try adjusting your search query or selecting a different privacy filter."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <article
              key={entry.id}
              id={`memory-card-${entry.id}`}
              className="p-5 rounded-2xl border border-stone-200/90 bg-white hover:border-stone-300 transition-all shadow-2xs group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-stone-500 mb-1.5">
                    <span className="font-mono text-[11px] text-stone-400">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {entry.mood && (
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-medium border border-stone-200/50">
                        {entry.mood}
                      </span>
                    )}
                    {entry.isGeminiPrivate ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-mono flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-700" />
                        <span>Private</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60 text-[10px] font-mono flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-stone-500" />
                        <span>Available to Gemini</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-serif font-medium text-stone-900 tracking-tight">
                    {entry.title || 'Untitled Entry'}
                  </h3>

                  <p className="text-xs sm:text-[13px] text-stone-600 mt-2 font-serif leading-relaxed line-clamp-3">
                    {entry.content}
                  </p>

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] text-stone-500 bg-stone-100/80 px-2 py-0.5 rounded-full border border-stone-200/40 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex-wrap">
                  {/* Keep Private Action Control */}
                  <button
                    id={`btn-toggle-private-${entry.id}`}
                    type="button"
                    onClick={() => onTogglePrivacy && onTogglePrivacy(entry)}
                    title={
                      entry.isGeminiPrivate
                        ? 'Currently private (excluded from Gemini). Click to make available to Gemini.'
                        : 'Keep Private (exclude from Gemini)'
                    }
                    aria-label={`Keep Private toggle for ${entry.title || 'memory'}`}
                    className={`min-h-[36px] px-2.5 flex items-center gap-1.5 rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none cursor-pointer ${
                      entry.isGeminiPrivate
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100/70'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/60'
                    }`}
                  >
                    {entry.isGeminiPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-sans font-medium">Keep Private</span>
                  </button>

                  <button
                    id={`btn-edit-memory-${entry.id}`}
                    type="button"
                    onClick={() => onSelectEntryToEdit(entry)}
                    title="Edit entry"
                    aria-label={`Edit entry titled ${entry.title}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-reflect-memory-${entry.id}`}
                    type="button"
                    onClick={() => onSelectEntryToReflect(entry)}
                    disabled={entry.isGeminiPrivate}
                    title={
                      entry.isGeminiPrivate
                        ? 'This entry is private. Excluded from Gemini reflection.'
                        : 'Reflect on this memory with Gemini'
                    }
                    aria-label={`Reflect with Gemini on ${entry.title}`}
                    className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none cursor-pointer ${
                      entry.isGeminiPrivate
                        ? 'text-stone-300 cursor-not-allowed'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-delete-memory-${entry.id}`}
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete entry"
                    aria-label={`Delete entry titled ${entry.title}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none cursor-pointer"
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
