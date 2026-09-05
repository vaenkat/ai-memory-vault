import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, Sparkles, Check, Tag, AlertCircle, RefreshCw } from 'lucide-react';
import { JournalEntry } from '../types';

interface TodayEditorProps {
  entry: JournalEntry | null;
  onSave: (entry: Partial<JournalEntry>) => Promise<void>;
  onStartReflection: (entry: JournalEntry, initialPrompt?: string) => void;
  onUpdateDraft?: (draft: Partial<JournalEntry>) => void;
  isSaving: boolean;
  lastSavedAt: string | null;
}

const MOOD_OPTIONS = [
  { id: 'Reflective', label: 'Reflective', icon: '🌱' },
  { id: 'Grateful', label: 'Grateful', icon: '☀️' },
  { id: 'Focused', label: 'Focused', icon: '🎯' },
  { id: 'Challenged', label: 'Challenged', icon: '🌊' },
  { id: 'Calm', label: 'Calm', icon: '🍃' },
];

export const TodayEditor: React.FC<TodayEditorProps> = ({
  entry,
  onSave,
  onStartReflection,
  onUpdateDraft,
  isSaving,
  lastSavedAt,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Reflective');
  const [isGeminiPrivate, setIsGeminiPrivate] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state when incoming active entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '');
      setContent(entry.content || '');
      setMood(entry.mood || 'Reflective');
      setIsGeminiPrivate(entry.isGeminiPrivate || false);
      setTags(entry.tags || []);
      setTagsInput((entry.tags || []).join(', '));
      setHasUnsavedChanges(false);
    } else {
      // New blank entry for today
      setTitle('');
      setContent('');
      setMood('Reflective');
      setIsGeminiPrivate(false);
      setTags([]);
      setTagsInput('');
      setHasUnsavedChanges(false);
    }
    setSaveError(null);
  }, [entry?.id, entry?.updatedAt, entry?.isGeminiPrivate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    setHasUnsavedChanges(true);
    onUpdateDraft?.({
      id: entry?.id,
      title: nextTitle,
      content,
      mood,
      isGeminiPrivate,
      tags,
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = e.target.value;
    setContent(nextContent);
    setHasUnsavedChanges(true);
    onUpdateDraft?.({
      id: entry?.id,
      title,
      content: nextContent,
      mood,
      isGeminiPrivate,
      tags,
    });
  };

  const handlePrivacyToggle = () => {
    const nextPrivate = !isGeminiPrivate;
    setIsGeminiPrivate(nextPrivate);
    setHasUnsavedChanges(true);
    onUpdateDraft?.({
      id: entry?.id,
      title,
      content,
      mood,
      isGeminiPrivate: nextPrivate,
      tags,
    });
  };

  const handleMoodSelect = (selectedMood: string) => {
    setMood(selectedMood);
    setHasUnsavedChanges(true);
  };

  const handleTagsBlur = () => {
    const parsed = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setTags(parsed);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) {
      setSaveError('Please enter some journal text or a title before saving.');
      return;
    }

    setSaveError(null);
    try {
      await onSave({
        id: entry?.id,
        title: title.trim() || 'Untitled Reflection',
        content: content.trim(),
        mood,
        isGeminiPrivate,
        tags,
      });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save entry. Your input has been preserved.');
    }
  };

  const currentEntrySnapshot: JournalEntry = {
    id: entry?.id || 'draft-entry',
    userId: entry?.userId || '',
    title: title.trim() || 'Untitled Reflection',
    content: content.trim(),
    tags,
    mood,
    isGeminiPrivate,
    createdAt: entry?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Calculate descriptive time greeting e.g. "Tuesday Afternoon"
  const getTimeGreeting = () => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
    const hour = now.getHours();
    let timeOfDay = 'Morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
    else if (hour >= 17) timeOfDay = 'Evening';
    return `${weekday} ${timeOfDay}`;
  };

  const [quickReflectionPrompt, setQuickReflectionPrompt] = useState('');

  const handleQuickReflectSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!content.trim()) {
      setSaveError('Please write your journal entry above before asking Gemini to reflect on it.');
      return;
    }
    if (isGeminiPrivate) return;

    const promptText =
      quickReflectionPrompt.trim() ||
      'Please reflect on this journal entry and share key observations, perspective, or thoughtful questions.';
    console.log('Today quick reflection submitted:', promptText);
    setQuickReflectionPrompt('');
    onStartReflection(
      {
        ...currentEntrySnapshot,
        title: title.trim() || 'Today\'s Reflection',
      },
      promptText
    );
  };

  return (
    <article id="today-journal-section" className="max-w-xl mx-auto flex flex-col h-full">
      {/* Top Metadata & Minimalist Privacy Switch */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100/90">
        <span className="text-gray-400 text-sm italic font-serif">
          {getTimeGreeting()}
        </span>

        <div className="flex items-center gap-4">
          {/* Save Status */}
          {lastSavedAt && !hasUnsavedChanges && (
            <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
              <Check className="w-3 h-3 text-emerald-600" />
              Saved
            </span>
          )}

          {/* Minimalist Private Switch */}
          <div className="flex items-center gap-2.5">
            <label
              htmlFor="btn-toggle-private"
              className="text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none"
            >
              Private Entry
            </label>
            <button
              id="btn-toggle-private"
              type="button"
              role="switch"
              aria-checked={isGeminiPrivate}
              aria-label="Toggle private entry status"
              onClick={handlePrivacyToggle}
              className={`w-9 h-5 rounded-full relative p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 ${
                isGeminiPrivate ? 'bg-[#121212]' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-150 ${
                  isGeminiPrivate ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <Lock className={`w-3.5 h-3.5 ${isGeminiPrivate ? 'text-[#121212]' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Hidden button for header-save-btn triggering */}
      <button
        id="btn-save-entry"
        onClick={handleSave}
        disabled={isSaving}
        className="hidden"
        aria-hidden="true"
      >
        Save
      </button>

      {/* Error Banner with Retry */}
      {saveError && (
        <div
          id="journal-save-error-banner"
          className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            id="btn-retry-save-entry"
            onClick={handleSave}
            className="font-medium underline hover:text-rose-950 shrink-0"
          >
            Retry Save
          </button>
        </div>
      )}

      {/* Privacy Notice Strip (Subtle Minimalist) */}
      {isGeminiPrivate && (
        <div
          id="privacy-classification-card"
          className="mb-4 px-3 py-2 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 text-xs flex items-center justify-between gap-2 font-mono"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-stone-700" />
            <span className="text-[11px]">FIREWALL ACTIVE: Strictly excluded from Gemini</span>
          </div>
          <span className="text-[10px] text-stone-500 uppercase tracking-wider">Zero-Access</span>
        </div>
      )}

      {/* Title Input (Minimalist Serif Display) */}
      <input
        id="entry-title-input"
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="On today's reflections and insights..."
        className="w-full text-2xl sm:text-3xl font-serif font-normal text-[#1A1A1A] placeholder:text-gray-300 border-none bg-transparent outline-none focus:ring-0 px-0 mb-4 leading-tight"
      />

      {/* Mood Selector Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4" aria-label="Select Mood">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.id}
            id={`mood-chip-${m.id}`}
            type="button"
            onClick={() => handleMoodSelect(m.id)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-stone-400 focus-visible:outline-none ${
              mood === m.id
                ? 'bg-[#121212] text-white'
                : 'bg-gray-100/90 text-stone-600 hover:bg-gray-200/70'
            }`}
          >
            <span className="text-xs">{m.icon}</span>
            <span className="text-[11px] font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Writing Ergonomic Area */}
      <div className="flex-1 overflow-y-auto pr-2">
        <textarea
          id="entry-content-textarea"
          value={content}
          onChange={handleContentChange}
          placeholder="Building the AI Memory Vault has been a lesson in restraint. Write freely in this quiet, private space..."
          rows={14}
          className="w-full text-base sm:text-lg font-serif text-gray-700 leading-relaxed placeholder:text-gray-300 border-none bg-transparent focus:outline-none focus:ring-0 p-0 resize-y"
          style={{ minHeight: '280px' }}
        />
      </div>

      {/* Tags Input (Clean Minimalist) */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-stone-500">
        <Tag className="w-3.5 h-3.5 text-stone-400" />
        <input
          id="entry-tags-input"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={handleTagsBlur}
          placeholder="Tags (comma-separated, e.g. engineering, security, reflections)"
          className="flex-1 bg-transparent border-none py-0.5 text-stone-700 placeholder:text-stone-400 focus:outline-none text-xs"
        />
        {tags.map((t, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full bg-gray-100 text-stone-600 text-[10px] font-medium"
          >
            #{t}
          </span>
        ))}
      </div>

      {/* Bottom Gemini Prompt Bar (from Clean Minimalism Design) */}
      <form
        onSubmit={handleQuickReflectSubmit}
        className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3"
      >
        <input
          id="quick-reflection-input"
          name="quickReflectionPrompt"
          type="text"
          value={quickReflectionPrompt}
          onChange={(e) => setQuickReflectionPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleQuickReflectSubmit(e);
            }
          }}
          placeholder={
            isGeminiPrivate
              ? 'Private entry — AI reflection is disabled'
              : 'Ask Gemini to reflect on this...'
          }
          disabled={isGeminiPrivate}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400 italic font-serif text-stone-800 disabled:cursor-not-allowed"
        />
        <button
          id="btn-reflect-entry"
          type="submit"
          disabled={!content.trim() || isGeminiPrivate}
          title={
            isGeminiPrivate
              ? 'Private entry. AI reflection is excluded by firewall.'
              : 'Ask Gemini to reflect on this entry'
          }
          className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 ${
            !content.trim() || isGeminiPrivate
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-[#121212] hover:bg-gray-100'
          }`}
          aria-label="Reflect with AI"
        >
          <Sparkles className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </form>
    </article>
  );
};
