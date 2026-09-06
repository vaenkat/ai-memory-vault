import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Lock, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, JournalEntry, PrivacyScope, Conversation } from '../types';
import { isEntryClassifiedPrivate } from '../lib/api';

interface ReflectViewProps {
  activeEntry: JournalEntry | null;
  allMemories: JournalEntry[];
  messages: ChatMessage[];
  onSendMessage: (
    prompt: string,
    scope: PrivacyScope,
    selectedMemoryIds: string[],
    selectedLabels?: string[]
  ) => Promise<void>;
  isGenerating: boolean;
  activeScope: PrivacyScope;
  onChangeScope: (scope: PrivacyScope) => void;
  onClearConversation: () => void;
  conversations?: Conversation[];
  currentConversationId?: string;
  onSelectConversation?: (conv: Conversation) => void;
  error: string | null;
  onRetry: () => void;
}

const PRESET_PROMPTS = [
  'Reflect on the deeper thoughts behind this entry',
  'What thoughtful questions should I explore next?',
  'Help me brainstorm constructive perspectives',
  'Synthesize how this connects to my broader life balance',
];

export const ReflectView: React.FC<ReflectViewProps> = ({
  activeEntry,
  allMemories,
  messages,
  onSendMessage,
  isGenerating,
  activeScope,
  onChangeScope,
  onClearConversation,
  conversations = [],
  currentConversationId,
  onSelectConversation,
  error,
  onRetry,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Eligible memories (excluding private entries)
  const eligibleMemories = React.useMemo(
    () => allMemories.filter((m) => !isEntryClassifiedPrivate(m)),
    [allMemories]
  );

  // Available labels from eligible memories only
  const allAvailableLabels = React.useMemo(() => {
    const labelSet = new Set<string>();
    eligibleMemories.forEach((m) => {
      if (Array.isArray(m.tags)) {
        m.tags.forEach((t) => {
          const trimmed = typeof t === 'string' ? t.trim() : '';
          if (trimmed) labelSet.add(trimmed);
        });
      }
    });
    return Array.from(labelSet).sort();
  }, [eligibleMemories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const textToSend = inputText.trim();
    setInputText('');
    await onSendMessage(textToSend, activeScope, selectedMemoryIds, selectedLabels);
  };

  const handlePresetClick = async (presetText: string) => {
    if (isGenerating) return;
    await onSendMessage(presetText, activeScope, selectedMemoryIds, selectedLabels);
  };

  const toggleMemorySelection = (id: string) => {
    setSelectedMemoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleLabelSelection = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const getStatusSubtext = () => {
    switch (activeScope) {
      case 'all_vault':
        return 'All available thoughts included · Private thoughts excluded';
      case 'selected':
        return `${selectedMemoryIds.length} specific thought${
          selectedMemoryIds.length === 1 ? '' : 's'
        } included · Private thoughts excluded`;
      case 'by_label': {
        const matchingCount = eligibleMemories.filter((m) => {
          const entryTags = (m.tags || []).map((t) => t.toLowerCase().trim());
          return selectedLabels.some((l) => entryTags.includes(l.toLowerCase().trim()));
        }).length;
        return selectedLabels.length > 0
          ? `${selectedLabels.map((l) => '#' + l).join(', ')} (${matchingCount} thought${
              matchingCount === 1 ? '' : 's'
            }) · Private thoughts excluded`
          : 'Select labels below · Private thoughts excluded';
      }
      case 'current':
        return activeEntry
          ? `Current thought only ("${activeEntry.title || 'Untitled'}") · Past thoughts excluded`
          : 'Current thought only · Past thoughts excluded';
      default:
        return 'All available thoughts included · Private thoughts excluded';
    }
  };

  return (
    <main id="reflect-view-section" className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Privacy Firewall Control Header */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 tracking-tight">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              <span>Protected by Privacy Firewall</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 font-serif italic">
              {getStatusSubtext()}
            </p>
          </div>

          {/* Controls: ONE primary scope control + subtle New Session button */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <select
              id="select-privacy-scope"
              value={activeScope}
              onChange={(e) => onChangeScope(e.target.value as PrivacyScope)}
              className="text-xs bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-400 transition-colors shadow-2xs cursor-pointer"
              aria-label="Select privacy scope for AI reflection"
            >
              <option value="all_vault">Entire Eligible Vault</option>
              <option value="selected">Specific Thoughts</option>
              <option value="by_label">By Label</option>
              <option value="current">Current Thought Only</option>
            </select>

            <button
              id="btn-clear-chat"
              onClick={onClearConversation}
              className="text-xs text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors shadow-2xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400"
              title="Start a fresh reflection session"
            >
              + New Session
            </button>
          </div>
        </div>

        {/* Specific Thoughts Picker Drawer */}
        {activeScope === 'selected' && (
          <div id="drawer-specific-thoughts" className="mt-4 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-700">
                Choose specific thoughts to share with Gemini ({selectedMemoryIds.length} selected):
              </span>
              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded font-mono">
                Private entries excluded
              </span>
            </div>

            {eligibleMemories.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                No memories available to Gemini found. Any entry marked as private is strictly excluded.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {eligibleMemories.map((m) => {
                  const isSelected = selectedMemoryIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      id={`memory-pill-${m.id}`}
                      onClick={() => toggleMemorySelection(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#121212] text-stone-100 border-[#121212]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>{m.title || 'Untitled'}</span>
                      <span className="text-[10px] opacity-70">
                        ({new Date(m.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* By Label Picker Drawer */}
        {activeScope === 'by_label' && (
          <div id="drawer-by-label" className="mt-4 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-700">
                Select labels to include ({selectedLabels.length} selected ·{' '}
                {
                  eligibleMemories.filter((m) => {
                    const entryTags = (m.tags || []).map((t) => t.toLowerCase().trim());
                    return selectedLabels.some((l) => entryTags.includes(l.toLowerCase().trim()));
                  }).length
                }{' '}
                matching thoughts):
              </span>
              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded font-mono">
                Private entries excluded
              </span>
            </div>

            {allAvailableLabels.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                No labels found on memories available to Gemini. Tag your entries with labels (#tags) to filter by label.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {allAvailableLabels.map((lbl) => {
                  const isSelected = selectedLabels.includes(lbl);
                  const countForLabel = eligibleMemories.filter((m) =>
                    (m.tags || []).some((t) => t.toLowerCase().trim() === lbl.toLowerCase().trim())
                  ).length;
                  return (
                    <button
                      key={lbl}
                      type="button"
                      id={`label-pill-${lbl}`}
                      onClick={() => toggleLabelSelection(lbl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#121212] text-stone-100 border-[#121212]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>#{lbl}</span>
                      <span className="text-[10px] opacity-70 font-mono">({countForLabel})</span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedLabels.length === 0 && allAvailableLabels.length > 0 && (
              <p className="text-[11px] text-stone-500 mt-2 italic font-mono">
                Click one or more labels above to share thoughts tagged with those labels.
              </p>
            )}
          </div>
        )}

        {/* Current Thought Only Indicator */}
        {activeScope === 'current' && !activeEntry && (
          <div id="drawer-current-thought-empty" className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 text-xs text-stone-500 font-mono">
            <span className="flex items-center gap-1.5 text-stone-600">
              <span>No specific thought attached. Gemini will converse without vault memories.</span>
            </span>
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
              Past memories withheld
            </span>
          </div>
        )}
      </div>

      {/* Active Context Preview Banner */}
      {activeEntry && (
        <div className="mb-4 px-3.5 py-2 bg-stone-100/80 border border-stone-200/80 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-stone-400 font-mono text-[11px]">Thought Context:</span>
            <span className="font-serif italic text-stone-800 truncate">
              {activeEntry.title || 'Untitled'}
            </span>
          </div>
          {isEntryClassifiedPrivate(activeEntry) ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-200 text-[10px] font-mono shrink-0 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Private (Withheld from Gemini)</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 text-[10px] font-mono shrink-0">
              Active Context
            </span>
          )}
        </div>
      )}

      {/* Messages Thread */}
      <div id="messages-container" className="flex-1 space-y-5 mb-6">
        {messages.length === 0 ? (
          <div
            id="empty-reflection-state"
            className="text-center py-12 px-6 rounded-2xl border border-stone-200/80 bg-white shadow-2xs my-auto"
          >
            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center mx-auto mb-3.5 border border-stone-200">
              <Sparkles className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-serif font-normal text-stone-900">
              Reflection Companion
            </h3>
            <p className="text-xs text-stone-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              Explore deeper questions, synthesize themes across your entries, or discover new perspectives. Your memories are protected by the server-side Privacy Firewall.
            </p>

            {/* Quick Prompts */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  id={`preset-prompt-${idx}`}
                  onClick={() => handlePresetClick(preset)}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-stone-700 text-xs hover:border-stone-400 hover:bg-white transition-all shadow-2xs font-serif italic"
                >
                  "{preset}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              id={`chat-message-${msg.id}`}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  {msg.role === 'user'
                    ? 'You'
                    : msg.isFallback || msg.provider === 'local_fallback'
                      ? 'Offline Local Fallback'
                      : 'Gemini Reflection'}
                </span>
                {msg.modelUsed && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      msg.isFallback || msg.provider === 'local_fallback'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {msg.isFallback || msg.provider === 'local_fallback'
                      ? '⚡ Degraded Mode (Offline Local Fallback)'
                      : msg.modelUsed}
                  </span>
                )}
                <span className="text-[10px] text-stone-400 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#121212] text-stone-100 rounded-br-xs shadow-2xs'
                    : 'bg-white border border-stone-200 text-stone-800 rounded-bl-xs shadow-2xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-sans text-xs sm:text-sm">{msg.content}</p>
                ) : (
                  <div className="markdown-body text-[14px] sm:text-[15px]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-stone-500 pl-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-600" />
            <span className="font-mono text-[11px]">Gemini is reflecting...</span>
          </div>
        )}

        {error && (
          <div
            id="chat-error-banner"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              id="btn-retry-chat"
              onClick={onRetry}
              className="font-medium underline hover:text-rose-950 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form id="reflect-input-form" onSubmit={handleSubmit} className="mt-auto pt-2">
        <div className="relative flex items-center bg-white border border-stone-300 focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-400/20 rounded-2xl shadow-xs transition-all">
          <input
            id="reflect-user-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question or request a perspective..."
            disabled={isGenerating}
            className="w-full pl-4 pr-12 py-3 text-xs sm:text-sm bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400 font-serif"
          />
          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            aria-label="Send reflection message"
            className={`absolute right-2 p-2 rounded-xl transition-all ${
              inputText.trim() && !isGenerating
                ? 'bg-[#121212] text-stone-100 hover:bg-stone-800 shadow-2xs'
                : 'text-stone-300 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </main>
  );
};
