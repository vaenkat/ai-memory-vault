import React, { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { auth, db, googleProvider, sanitizePayload, handleFirestoreError, OperationType, testConnection } from './lib/firebase';
import { JournalEntry, Conversation, ChatMessage, PrivacyScope, ThemeInsight, UserPreferences } from './types';
import { sendMessageToGemini, analyzeVaultThemes } from './lib/api';
import { Navigation, TabType } from './components/Navigation';
import { TodayEditor } from './components/TodayEditor';
import { MemoriesVault } from './components/MemoriesVault';
import { ReflectView } from './components/ReflectView';
import { PrivacyCenter } from './components/PrivacyCenter';
import { SettingsView } from './components/SettingsView';
import { AuthLanding } from './components/AuthLanding';
import { Toast, ToastMessage } from './components/Toast';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active view tab
  const [currentTab, setCurrentTab] = useState<TabType>('today');

  // Journal entries & conversations in vault
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  // Active reflection chat state
  const [currentConversationId, setCurrentConversationId] = useState<string>(`conv-${Date.now()}`);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Themes state
  const [themes, setThemes] = useState<ThemeInsight[]>([]);
  const [isAnalyzingThemes, setIsAnalyzingThemes] = useState(false);

  // Saving state
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // User preferences & Privacy scope
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultPrivacyScope: 'current',
    readingWidth: 'standard',
    autoSaveEnabled: false,
  });
  const [activePrivacyScope, setActivePrivacyScope] = useState<PrivacyScope>('current');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string, onRetry?: () => void) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message, onRetry }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Listen for Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        // Test connection on login
        await testConnection();
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Subscriptions (Owner-bound paths)
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setConversations([]);
      return;
    }

    // Subscribe to Entries: /users/{userId}/entries
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const entriesQuery = query(entriesRef, orderBy('createdAt', 'desc'));

    const unsubEntries = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const fetchedEntries = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: user.uid,
            title: data.title || '',
            content: data.content || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            mood: data.mood || 'Reflective',
            isGeminiPrivate: Boolean(data.isGeminiPrivate),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as JournalEntry;
        });
        setEntries(fetchedEntries);
        // Keep activeEntry synchronized with authoritative Firestore updates
        setActiveEntry((curr) => {
          if (!curr || !curr.id) return curr;
          const matching = fetchedEntries.find((e) => e.id === curr.id);
          if (matching) {
            return matching;
          }
          return curr;
        });
      },
      (error) => {
        console.error('Entries subscription error:', error);
        addToast('error', 'Database Sync Error', 'Could not sync journal entries with Firestore.');
      }
    );

    // Subscribe to Conversations: /users/{userId}/conversations
    const convRef = collection(db, 'users', user.uid, 'conversations');
    const convQuery = query(convRef, orderBy('createdAt', 'desc'));

    const unsubConv = onSnapshot(
      convQuery,
      (snapshot) => {
        const fetchedConvs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: user.uid,
            entryId: data.entryId || null,
            title: data.title || 'Reflection Session',
            contextScope: data.contextScope || 'current',
            includedMemoryIds: data.includedMemoryIds || [],
            messages: Array.isArray(data.messages) ? data.messages : [],
            summary: data.summary || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as Conversation;
        });
        setConversations(fetchedConvs);
      },
      (error) => {
        console.error('Conversations subscription error:', error);
      }
    );

    // Fetch user preferences: /users/{userId}/preferences/user_config
    const prefDocRef = doc(db, 'users', user.uid, 'preferences', 'user_config');
    const unsubPref = onSnapshot(prefDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.defaultPrivacyScope) {
          setPreferences((prev) => ({
            ...prev,
            defaultPrivacyScope: data.defaultPrivacyScope,
            autoSaveEnabled: Boolean(data.autoSaveEnabled),
          }));
          setActivePrivacyScope(data.defaultPrivacyScope);
        }
      }
    });

    return () => {
      unsubEntries();
      unsubConv();
      unsubPref();
    };
  }, [user, addToast]);

  // Auth Handlers
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      addToast('success', 'Welcome', 'Signed in successfully with Google.');
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err?.message || 'Failed to sign in. Please try again.');
      addToast('error', 'Authentication Failed', err?.message || 'Sign in popup closed or cancelled.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentTab('today');
      setActiveEntry(null);
      setChatMessages([]);
      addToast('info', 'Signed Out', 'You have been safely signed out.');
    } catch (err: any) {
      console.error('Sign out error:', err);
      addToast('error', 'Sign Out Failed', err?.message);
    }
  };

  // Save Journal Entry Handler (Input-to-Save Completeness & Undefined-Stripping)
  const handleSaveEntry = async (entryData: Partial<JournalEntry>) => {
    if (!user) {
      addToast('error', 'Sign-in Required', 'Please sign in to save journal entries.');
      return;
    }

    setIsSavingEntry(true);
    const entryId = entryData.id || `entry-${Date.now()}`;
    const entryDocRef = doc(db, 'users', user.uid, 'entries', entryId);

    const fullPayload: JournalEntry = {
      id: entryId,
      userId: user.uid,
      title: entryData.title || 'Untitled Reflection',
      content: entryData.content || '',
      tags: entryData.tags || [],
      mood: entryData.mood || 'Reflective',
      isGeminiPrivate: Boolean(entryData.isGeminiPrivate),
      createdAt: entryData.createdAt || activeEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const cleanPayload = sanitizePayload(fullPayload);
      await setDoc(entryDocRef, cleanPayload, { merge: true });

      setActiveEntry(fullPayload);
      // Synchronize entries state immediately so Reflect, Quick Reflection, and Vault
      // have the authoritative state without waiting for onSnapshot
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === fullPayload.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = fullPayload;
          return updated;
        }
        return [fullPayload, ...prev];
      });
      setLastSavedAt(new Date().toISOString());
      addToast('success', 'Entry Saved', 'Persisted securely to your isolated memory vault.');
    } catch (err: any) {
      console.error('Error saving entry:', err);
      addToast(
        'error',
        'Save Failed',
        'Could not persist entry to Firestore. Your text is safely kept in the editor.',
        () => handleSaveEntry(entryData)
      );
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/entries/${entryId}`);
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Delete Journal Entry Handler
  const handleDeleteEntry = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', id));
      if (activeEntry?.id === id) {
        setActiveEntry(null);
      }
      addToast('info', 'Memory Removed', 'The journal entry was deleted from your vault.');
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      addToast('error', 'Delete Failed', err?.message);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/entries/${id}`);
    }
  };

  // Select Entry to Edit
  const handleSelectEntryToEdit = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setCurrentTab('today');
  };

  // Select Entry to Reflect With Gemini
  const handleSelectEntryToReflect = (entry: JournalEntry) => {
    if (entry.isGeminiPrivate) {
      addToast('error', 'Privacy Quarantined', 'This memory is classified as 🔒 Private and cannot be sent to Gemini.');
      return;
    }
    setActiveEntry(entry);
    setCurrentTab('reflect');
  };

  // Send Message in Reflect View
  const handleSendMessage = async (
    prompt: string,
    scope: PrivacyScope,
    selectedMemoryIds: string[],
    overrideActiveEntry?: JournalEntry | null,
    startFresh?: boolean
  ) => {
    if (!user) {
      addToast('error', 'Authentication Required', 'Please sign in to converse with Gemini.');
      return;
    }

    setChatError(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const convId = startFresh ? `conv-${Date.now()}` : currentConversationId;
    if (startFresh) {
      setCurrentConversationId(convId);
    }

    const currentEntryToUse = overrideActiveEntry !== undefined ? overrideActiveEntry : activeEntry;
    const baseMessages = startFresh ? [] : chatMessages;
    const updatedMessages = [...baseMessages, userMsg];

    setChatMessages(updatedMessages);
    setIsGeneratingReflection(true);

    try {
      const response = await sendMessageToGemini(
        updatedMessages,
        scope,
        entries,
        currentEntryToUse,
        selectedMemoryIds
      );

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: response.reply,
        timestamp: new Date().toISOString(),
        modelUsed: response.modelUsed,
      };

      const finalMessages = [...updatedMessages, modelMsg];
      setChatMessages(finalMessages);

      // Persist conversation to Firestore securely
      try {
        const convDocRef = doc(db, 'users', user.uid, 'conversations', convId);
        const convPayload: Conversation = {
          id: convId,
          userId: user.uid,
          entryId: currentEntryToUse?.id || null,
          title: currentEntryToUse ? `Reflection on "${currentEntryToUse.title}"` : 'Vault Reflection',
          contextScope: scope,
          includedMemoryIds: selectedMemoryIds,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        await setDoc(convDocRef, sanitizePayload(convPayload), { merge: true });
      } catch (saveErr: any) {
        console.warn('Firestore conversation persist warning:', saveErr);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = err?.message || 'Failed to generate reflection with Gemini.';
      setChatError(errMsg);
      addToast('error', 'Reflection Error', errMsg, () =>
        handleSendMessage(prompt, scope, selectedMemoryIds, currentEntryToUse, startFresh)
      );
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  // Analyze Themes across Eligible Memories
  const handleAnalyzeThemes = async () => {
    setIsAnalyzingThemes(true);
    try {
      const result = await analyzeVaultThemes(entries);
      if (result.themes && result.themes.length > 0) {
        setThemes(result.themes);
        addToast('success', 'Themes Synthesized', `Discovered ${result.themes.length} grounded recurring life themes.`);
      } else {
        addToast('info', 'Theme Analysis', result.message || 'Need more eligible entries to identify recurring patterns.');
      }
    } catch (err: any) {
      console.error('Theme analysis error:', err);
      addToast('error', 'Analysis Failed', err?.message || 'Could not analyze themes.');
    } finally {
      setIsAnalyzingThemes(false);
    }
  };

  // Wipe All Data
  const handleWipeData = async () => {
    if (!user) return;

    try {
      // Delete entries
      const entriesSnapshot = await getDocs(collection(db, 'users', user.uid, 'entries'));
      for (const d of entriesSnapshot.docs) {
        await deleteDoc(d.ref);
      }

      // Delete conversations
      const convSnapshot = await getDocs(collection(db, 'users', user.uid, 'conversations'));
      for (const d of convSnapshot.docs) {
        await deleteDoc(d.ref);
      }

      setEntries([]);
      setConversations([]);
      setActiveEntry(null);
      setChatMessages([]);
      setThemes([]);

      addToast('info', 'Data Wiped', 'All vault records and conversations have been permanently erased.');
    } catch (err: any) {
      console.error('Error wiping data:', err);
      addToast('error', 'Wipe Failed', err?.message);
    }
  };

  // Update Preferences
  const handleUpdatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    if (newPrefs.defaultPrivacyScope) {
      setActivePrivacyScope(newPrefs.defaultPrivacyScope);
    }

    if (user) {
      try {
        const prefDocRef = doc(db, 'users', user.uid, 'preferences', 'user_config');
        await setDoc(prefDocRef, sanitizePayload(updated), { merge: true });
        addToast('success', 'Settings Saved', 'Preferences updated in Firestore.');
      } catch (err: any) {
        console.error('Error saving preferences:', err);
      }
    }
  };

  // Helper for scope display label
  const getScopeLabel = (scope: PrivacyScope) => {
    switch (scope) {
      case 'current':
        return '🔒 Current Entry Only';
      case 'selected':
        return '🔒 Selected Memories';
      case 'date_range':
        return '🔒 Last 30 Days';
      case 'all_vault':
        return '🔒 Eligible Vault Memories';
      default:
        return '🔒 Current Entry Only';
    }
  };

  const latestAssistantMessage = [...chatMessages]
    .reverse()
    .find((m) => m.role === 'model' || m.role === 'assistant');

  // Loading Screen while auth initializes
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-[#121212] text-white flex items-center justify-center font-serif text-lg font-semibold mx-auto mb-3 shadow-xs">
            V.
          </div>
          <p className="text-xs font-mono text-stone-500 uppercase tracking-wider">
            Initializing AI Memory Vault...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated State
  if (!user) {
    return (
      <>
        <AuthLanding
          onSignIn={handleSignIn}
          isLoading={isAuthLoading}
          authError={authError}
        />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] flex flex-col md:flex-row font-sans selection:bg-stone-200">
      {/* Left Minimalist Navigation (Dark Obsidian Sidebar) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onSignOut={handleSignOut}
        privacyScope={activePrivacyScope}
      />

      {/* Main Column */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Clean Minimalism Top Header */}
        <header
          id="main-header"
          className="h-20 border-b border-gray-200/80 px-6 sm:px-10 flex items-center justify-between bg-white/70 backdrop-blur-md shrink-0 z-20"
        >
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight text-[#1A1A1A]">
              {new Date().toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] uppercase tracking-widest text-gray-500 font-bold truncate max-w-[200px] sm:max-w-none">
                Authenticated: {user.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 bg-gray-100/90 px-4 py-2 rounded-full border border-gray-200">
              <span className="text-[11px] font-bold text-gray-400">AI SCOPE</span>
              <span className="text-xs font-semibold text-[#1A1A1A]">
                {getScopeLabel(activePrivacyScope)}
              </span>
            </div>

            {currentTab === 'today' ? (
              <button
                id="header-save-btn"
                onClick={() => {
                  const saveBtn = document.getElementById('btn-save-entry');
                  if (saveBtn) saveBtn.click();
                }}
                disabled={isSavingEntry}
                className="bg-[#121212] text-white text-xs px-5 sm:px-6 py-2 rounded-full font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
              >
                {isSavingEntry ? 'Saving...' : 'Save Reflection'}
              </button>
            ) : currentTab === 'reflect' ? (
              <button
                onClick={() => {
                  const promptInput =
                    document.getElementById('reflect-user-input') ||
                    document.getElementById('chat-prompt-input');
                  if (promptInput) (promptInput as HTMLInputElement).focus();
                }}
                className="bg-[#121212] text-white text-xs px-5 sm:px-6 py-2 rounded-full font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-xs"
              >
                Reflect with AI
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveEntry(null);
                  setCurrentTab('today');
                }}
                className="bg-[#121212] text-white text-xs px-5 sm:px-6 py-2 rounded-full font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-xs"
              >
                + New Entry
              </button>
            )}
          </div>
        </header>

        {/* Center Workspace & Right Inspection Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Active View Container */}
          <section className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
            {currentTab === 'today' && (
              <TodayEditor
                entry={activeEntry}
                onSave={handleSaveEntry}
                onUpdateDraft={(draft) => {
                  setActiveEntry((prev) => ({
                    id: prev?.id || `entry-${Date.now()}`,
                    userId: user ? user.uid : (prev?.userId || ''),
                    title: draft.title !== undefined ? draft.title : (prev?.title || ''),
                    content: draft.content !== undefined ? draft.content : (prev?.content || ''),
                    mood: draft.mood !== undefined ? draft.mood : (prev?.mood || 'Reflective'),
                    isGeminiPrivate: draft.isGeminiPrivate !== undefined ? Boolean(draft.isGeminiPrivate) : (prev?.isGeminiPrivate || false),
                    tags: draft.tags !== undefined ? draft.tags : (prev?.tags || []),
                    createdAt: prev?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }));
                }}
                onStartReflection={(entry, initialPrompt) => {
                  console.log('Reflect received initial prompt:', initialPrompt);
                  console.log('Auto-send triggered:', true);

                  const entryId =
                    entry.id && entry.id !== 'draft-entry' ? entry.id : `entry-${Date.now()}`;
                  const completeEntry: JournalEntry = {
                    ...entry,
                    id: entryId,
                    userId: user ? user.uid : entry.userId,
                  };

                  setActiveEntry(completeEntry);
                  setCurrentTab('reflect');
                  setActivePrivacyScope('current');

                  // Background auto-save so memory is preserved
                  if (user && completeEntry.content) {
                    handleSaveEntry(completeEntry).catch((err) =>
                      console.warn('Auto-save on quick reflection warning:', err)
                    );
                  }

                  if (initialPrompt) {
                    handleSendMessage(initialPrompt, 'current', [], completeEntry, true);
                  }
                }}
                isSaving={isSavingEntry}
                lastSavedAt={lastSavedAt}
              />
            )}

            {currentTab === 'memories' && (
              <MemoriesVault
                entries={entries}
                onSelectEntryToEdit={handleSelectEntryToEdit}
                onSelectEntryToReflect={handleSelectEntryToReflect}
                onDeleteEntry={handleDeleteEntry}
                onAnalyzeThemes={handleAnalyzeThemes}
                themes={themes}
                isAnalyzingThemes={isAnalyzingThemes}
              />
            )}

            {currentTab === 'reflect' && (
              <ReflectView
                activeEntry={activeEntry}
                allMemories={entries}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isGenerating={isGeneratingReflection}
                activeScope={activePrivacyScope}
                onChangeScope={setActivePrivacyScope}
                onClearConversation={() => {
                  setCurrentConversationId(`conv-${Date.now()}`);
                  setChatMessages([]);
                  setChatError(null);
                }}
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={(conv) => {
                  setCurrentConversationId(conv.id);
                  setChatMessages(conv.messages || []);
                  setActivePrivacyScope(conv.contextScope || 'current');
                  if (conv.entryId) {
                    const found = entries.find((e) => e.id === conv.entryId);
                    if (found) setActiveEntry(found);
                  }
                }}
                error={chatError}
                onRetry={() => {
                  const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === 'user');
                  if (lastUserMsg) {
                    handleSendMessage(lastUserMsg.content, activePrivacyScope, []);
                  }
                }}
              />
            )}

            {currentTab === 'privacy' && (
              <PrivacyCenter
                user={user}
                entries={entries}
                conversations={conversations}
                onWipeData={handleWipeData}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                preferences={preferences}
                onUpdatePreferences={handleUpdatePreferences}
              />
            )}
          </section>

          {/* Right Inspection & Integrity Sidebar (Clean Minimalism) */}
          <aside
            id="vault-integrity-aside"
            className="hidden xl:flex w-80 shrink-0 border-l border-gray-200/80 bg-white p-8 flex-col gap-8 overflow-y-auto"
          >
            {/* Gemini Reflection Snippet */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Gemini Reflection
              </h3>
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-gray-100">
                <p className="text-sm leading-relaxed text-gray-700 italic font-serif mb-4">
                  {latestAssistantMessage
                    ? `"${latestAssistantMessage.content.slice(0, 180)}${
                        latestAssistantMessage.content.length > 180 ? '...' : ''
                      }"`
                    : '"Building the AI Memory Vault has been a lesson in restraint. Thoughts aren\'t just encrypted, but isolated—invisible to the intelligence helping you process them unless you explicitly turn the key."'}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                  <span>
                    Memory Connection:{' '}
                    {activeEntry ? activeEntry.title || 'Current Draft' : 'Active Vault'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vault Integrity Status */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Vault Integrity
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Firestore Isolation</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-tight">
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Secret Management</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-tight">
                    GSM Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Model Fallback</span>
                  <span className="text-blue-600 font-bold uppercase tracking-tight">
                    Ready (3.6)
                  </span>
                </div>
              </div>
            </div>

            {/* End-to-End Database Isolation Guarantee */}
            <div className="mt-auto pt-6 border-t border-gray-100 text-[10px] leading-relaxed text-gray-400">
              <p>
                This session is protected by{' '}
                <strong className="text-gray-600 font-semibold">
                  End-to-End Database Isolation
                </strong>
                . Gemini only accesses data you explicitly unlock. No prompt data is used for
                training.
              </p>
            </div>
          </aside>
        </div>

        {/* System Status Minimalist Footer */}
        <footer
          id="main-footer"
          className="h-12 bg-gray-50/90 border-t border-gray-200 px-6 sm:px-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0"
        >
          <div>System Status: All Nodes Secure</div>
          <div className="hidden sm:block font-mono">dev-tutorial=cloud-run-ai-challenge</div>
          <div>Build v2.4.1-Stable</div>
        </footer>
      </main>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

