import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Lock, Shield, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, History } from 'lucide-react';
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
    selectedMemoryIds: string[]
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
  const [showMemoryPicker, setShowMemoryPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Eligible memories (excluding private entries)
  const eligibleMemories = allMemories.filter((m) => !isEntryClassifiedPrivate(m));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const textToSend = inputText.trim();
    setInputText('');
    await onSendMessage(textToSend, activeScope, selectedMemoryIds);
  };

  const handlePresetClick = async (presetText: string) => {
    if (isGenerating) return;
    await onSendMessage(presetText, activeScope, selectedMemoryIds);
  };

  const toggleMemorySelection = (id: string) => {
    setSelectedMemoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getScopeBadge = () => {
    switch (activeScope) {
      case 'current':
        return {
          title: '🔒 Protected · Current entry only',
          desc: 'Gemini has zero access to past memories; only the current draft is provided.',
        };
      case 'selected':
        return {
          title: `🔒 Protected · ${selectedMemoryIds.length} Selected memories`,
          desc: 'Only specifically chosen eligible memories are shared with Gemini.',
        };
      case 'date_range':
        return {
          title: '🔒 Protected · Last 30 days',
          desc: 'Eligible non-private memories from the last month are provided for context.',
        };
      case 'all_vault':
        return {
          title: '🔒 Protected · Entire eligible vault',
          desc: 'All non-private memories are accessible. Private entries remain strictly excluded.',
        };
    }
  };

  const scopeBadge = getScopeBadge();

  return (
    <main id="reflect-view-section" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Privacy Firewall Control Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                <Shield className="w-3 h-3 text-emerald-700" />
                {scopeBadge.title}
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                AI PRIVACY FIREWALL
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1">{scopeBadge.desc}</p>
          </div>

          {/* Context Scope Dropdown / Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {conversations && conversations.length > 0 && (
              <select
                id="select-saved-conversation"
                value={currentConversationId || ''}
                onChange={(e) => {
                  const conv = conversations.find((c) => c.id === e.target.value);
                  if (conv && onSelectConversation) onSelectConversation(conv);
                }}
                className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-700 font-medium focus:outline-none focus:border-stone-500 max-w-[170px] truncate"
                aria-label="Switch between saved reflection sessions"
              >
                <option value="" disabled>
                  History ({conversations.length})
                </option>
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || 'Untitled Session'}
                  </option>
                ))}
              </select>
            )}

            <select
              id="select-privacy-scope"
              value={activeScope}
              onChange={(e) => onChangeScope(e.target.value as PrivacyScope)}
              className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 font-medium focus:outline-none focus:border-stone-500"
              aria-label="Select privacy scope for AI reflection"
            >
              <option value="current">Current entry only (Default)</option>
              <option value="selected">Selected memories...</option>
              <option value="date_range">Last 30 days</option>
              <option value="all_vault">Entire eligible vault</option>
            </select>

            <button
              id="btn-clear-chat"
              onClick={onClearConversation}
              className="text-xs text-stone-600 hover:text-stone-900 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors shadow-2xs font-medium"
              title="Start a fresh reflection session"
            >
              + New Session
            </button>
          </div>
        </div>

        {/* Selected Memories Picker Drawer */}
        {activeScope === 'selected' && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-800">
                Choose eligible memories to share with Gemini ({selectedMemoryIds.length} selected):
              </span>
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono">
                Private entries excluded
              </span>
            </div>

            {eligibleMemories.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                No eligible memories found. Any entry marked as private is permanently barred from Gemini.
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
                          ? 'bg-stone-900 text-stone-100 border-stone-900'
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
      </div>

      {/* Active Context Preview Banner */}
      {activeEntry && (
        <div className="mb-4 px-4 py-2.5 bg-stone-100/70 border border-stone-200 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-stone-500 font-mono">Active Entry:</span>
            <span className="font-medium text-stone-900 truncate">
              {activeEntry.title || 'Untitled'}
            </span>
          </div>
          {isEntryClassifiedPrivate(activeEntry) ? (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-medium shrink-0 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Private Entry (Text withheld from AI)</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-medium shrink-0">
              Active Context
            </span>
          )}
        </div>
      )}

      {/* Messages Thread */}
      <div id="messages-container" className="flex-1 space-y-4 mb-6">
        {messages.length === 0 ? (
          <div
            id="empty-reflection-state"
            className="text-center py-12 px-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50/40 my-auto"
          >
            <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif font-medium text-stone-900">
              Reflective Conversation with Gemini
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
              Explore perspectives, discover recurring patterns, or brainstorm ideas. Your entries are protected by the AI Privacy Firewall.
            </p>

            {/* Quick Prompts */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  id={`preset-prompt-${idx}`}
                  onClick={() => handlePresetClick(preset)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 text-xs hover:border-stone-400 hover:bg-stone-50 transition-colors shadow-2xs"
                >
                  {preset}
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
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-mono uppercase text-stone-400">
                  {msg.role === 'user' ? 'You' : 'Gemini Companion'}
                </span>
                {msg.modelUsed && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-stone-200/80 rounded text-stone-600">
                    {msg.modelUsed}
                  </span>
                )}
                <span className="text-[10px] text-stone-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-stone-900 text-stone-100 rounded-br-xs'
                    : 'bg-white border border-stone-200 text-stone-800 rounded-bl-xs shadow-2xs font-serif'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                ) : (
                  <div className="markdown-body prose prose-stone prose-sm max-w-none">
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
            <span className="font-mono">Reflecting with Gemini... (Fallback ladder active)</span>
          </div>
        )}

        {error && (
          <div
            id="chat-error-banner"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2"
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
            placeholder="Ask Gemini to reflect, summarize, or brainstorm..."
            disabled={isGenerating}
            className="w-full pl-4 pr-12 py-3 text-xs sm:text-sm bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400"
          />
          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            aria-label="Send reflection message"
            className={`absolute right-2 p-2 rounded-xl transition-all ${
              inputText.trim() && !isGenerating
                ? 'bg-stone-900 text-stone-100 hover:bg-stone-800'
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
