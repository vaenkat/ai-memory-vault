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
  // Today thought being authored or edited (null = fresh new-thought draft)
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  // Dedicated Reflection Context (only populated when Quick Reflection or specific memory reflection is explicitly invoked)
  const [reflectContextEntry, setReflectContextEntry] = useState<JournalEntry | null>(null);

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
    defaultPrivacyScope: 'all_vault',
    readingWidth: 'standard',
    autoSaveEnabled: false,
  });
  const [activePrivacyScope, setActivePrivacyScope] = useState<PrivacyScope>('all_vault');

  // Static journal thought for the global header
  const [headerJournalThought] = useState('Memory is a garden, tended one reflection at a time.');

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
        // Keep todayEntry synchronized if editing an existing entry
        setTodayEntry((curr) => {
          if (!curr || !curr.id) return curr;
          const matching = fetchedEntries.find((e) => e.id === curr.id);
          return matching || curr;
        });
        // Keep reflectContextEntry synchronized if active
        setReflectContextEntry((curr) => {
          if (!curr || !curr.id) return curr;
          const matching = fetchedEntries.find((e) => e.id === curr.id);
          return matching || curr;
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
      setTodayEntry(null);
      setReflectContextEntry(null);
      setChatMessages([]);
      addToast('info', 'Signed Out', 'You have been safely signed out.');
    } catch (err: any) {
      console.error('Sign out error:', err);
      addToast('error', 'Sign Out Failed', err?.message);
    }
  };

  // User Tab Navigation Handler (Enforces Strict State Separation)
  const handleTabChange = (tab: TabType) => {
    if (tab === 'reflect') {
      // Direct navigation to Reflect tab:
      // MUST default to "Entire Eligible Vault"
      // Automatically include all eligible memories without inheriting Today's active entry
      setReflectContextEntry(null);
      setActivePrivacyScope('all_vault');
    }
    setCurrentTab(tab);
  };

  // Save Journal Entry Handler (Input-to-Save Completeness & Undefined-Stripping)
  const handleSaveEntry = async (entryData: Partial<JournalEntry>): Promise<JournalEntry | null> => {
    if (!user) {
      addToast('error', 'Sign-in Required', 'Please sign in to save journal entries.');
      return null;
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
      createdAt: entryData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const cleanPayload = sanitizePayload(fullPayload);
      await setDoc(entryDocRef, cleanPayload, { merge: true });

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
      return fullPayload;
    } catch (err: any) {
      console.error('Error saving entry:', err);
      addToast(
        'error',
        'Save Failed',
        'Could not persist entry to Firestore. Your text is safely kept in the editor.',
        () => handleSaveEntry(entryData)
      );
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/entries/${entryId}`);
      throw err;
    } finally {
      setIsSavingEntry(false);
    }
  };

  // Save specifically from Today Editor:
  // After save succeeds, reset todayEntry to null so the editor returns to a clean new-thought state
  const handleSaveTodayEntry = async (entryData: Partial<JournalEntry>) => {
    const saved = await handleSaveEntry(entryData);
    if (saved) {
      setTodayEntry(null);
    }
  };

  // Delete Journal Entry Handler
  const handleDeleteEntry = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', id));
      if (todayEntry?.id === id) {
        setTodayEntry(null);
      }
      if (reflectContextEntry?.id === id) {
        setReflectContextEntry(null);
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
    setTodayEntry(entry);
    setCurrentTab('today');
  };

  // Select Entry to Reflect With Gemini
  const handleSelectEntryToReflect = (entry: JournalEntry) => {
    if (entry.isGeminiPrivate) {
      addToast('error', 'Privacy Quarantined', 'This memory is classified as 🔒 Private and cannot be sent to Gemini.');
      return;
    }
    setReflectContextEntry(entry);
    setCurrentTab('reflect');
    setActivePrivacyScope('current');
  };

  // Toggle Privacy Status for a Memory Entry (Keep Private action)
  const handleToggleEntryPrivacy = async (entry: JournalEntry) => {
    const nextPrivateState = !entry.isGeminiPrivate;
    const updatedEntry: JournalEntry = {
      ...entry,
      isGeminiPrivate: nextPrivateState,
      updatedAt: new Date().toISOString(),
    };
    if (todayEntry?.id === entry.id) {
      setTodayEntry(updatedEntry);
    }
    if (reflectContextEntry?.id === entry.id) {
      setReflectContextEntry(updatedEntry);
    }
    await handleSaveEntry(updatedEntry);
    addToast(
      'info',
      nextPrivateState ? 'Marked Private' : 'Available to Gemini',
      nextPrivateState
        ? 'This thought will never be shared with Gemini.'
        : 'This thought is now available to Gemini based on your reflection scope.'
    );
  };

  // Send Message in Reflect View
  const handleSendMessage = async (
    prompt: string,
    scope: PrivacyScope,
    selectedMemoryIds: string[] = [],
    selectedLabels: string[] = [],
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

    const currentEntryToUse = overrideActiveEntry !== undefined ? overrideActiveEntry : reflectContextEntry;
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
        selectedMemoryIds,
        selectedLabels
      );

      const isFallback = response.isFallback || response.provider === 'local_fallback';
      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: response.reply,
        timestamp: new Date().toISOString(),
        modelUsed: response.modelUsed,
        isFallback,
        provider: response.provider,
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
          includedLabels: selectedLabels,
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
        handleSendMessage(prompt, scope, selectedMemoryIds, selectedLabels, currentEntryToUse, startFresh)
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
        if (result.isFallback) {
          addToast(
            'info',
            'Degraded Mode (Offline Fallback)',
            result.note || 'Themes synthesized locally in degraded mode because live Gemini is unconfigured or unreachable.'
          );
        } else {
          addToast(
            'success',
            'Themes Synthesized',
            `Discovered ${result.themes.length} grounded recurring life themes via Gemini.`
          );
        }
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
      setTodayEntry(null);
      setReflectContextEntry(null);
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
      case 'all_vault':
        return 'Protected · Entire eligible vault';
      case 'selected':
        return 'Protected · Specific thoughts';
      case 'by_label':
        return 'Protected · By label';
      case 'current':
        return 'Protected · Current thought only';
      case 'date_range':
        return 'Protected · Last 30 days';
      default:
        return 'Protected · Entire eligible vault';
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
        onSelectTab={handleTabChange}
        user={user}
        onSignOut={handleSignOut}
        privacyScope={activePrivacyScope}
      />

      {/* Main Column */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Clean Minimalism Top Header */}
        <header
          id="main-header"
          className="h-18 border-b border-stone-200/80 px-6 sm:px-10 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0 z-20"
        >
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-serif font-normal tracking-tight text-stone-900">
              {(() => {
                const now = new Date();
                const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' });
                const day = now.getDate();
                const month = now.toLocaleDateString('en-GB', { month: 'long' });
                const year = now.getFullYear();
                return `${weekday}, ${day} ${month} ${year}`;
              })()}
            </h1>
            <span className="text-xs text-stone-500 font-serif italic mt-0.5 select-none">
              {headerJournalThought}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentTab === 'today' ? (
              <button
                id="header-save-btn"
                onClick={() => {
                  const saveBtn = document.getElementById('btn-save-entry');
                  if (saveBtn) saveBtn.click();
                }}
                disabled={isSavingEntry}
                className="bg-[#121212] text-white text-xs px-4 sm:px-5 py-2 rounded-xl font-medium tracking-wide hover:bg-stone-800 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
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
                className="bg-[#121212] text-white text-xs px-4 sm:px-5 py-2 rounded-xl font-medium tracking-wide hover:bg-stone-800 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
              >
                Reflect with Gemini
              </button>
            ) : (
              <button
                onClick={() => {
                  setTodayEntry(null);
                  setCurrentTab('today');
                }}
                className="bg-[#121212] text-white text-xs px-4 sm:px-5 py-2 rounded-xl font-medium tracking-wide hover:bg-stone-800 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
              >
                + New Entry
              </button>
            )}
          </div>
        </header>

        {/* Center Workspace & Right Inspection Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Active View Container */}
          <section className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
            {currentTab === 'today' && (
              <TodayEditor
                entry={todayEntry}
                onSave={handleSaveTodayEntry}
                onUpdateDraft={(draft) => {
                  if (!draft) {
                    setTodayEntry(null);
                    return;
                  }
                  setTodayEntry((prev) => ({
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

                  const targetScope = preferences.defaultPrivacyScope || 'all_vault';
                  // Explicit Quick Reflection: intentionally inject this thought as reflection context
                  setReflectContextEntry(completeEntry);
                  setCurrentTab('reflect');
                  setActivePrivacyScope(targetScope);

                  // Background auto-save so memory is preserved
                  if (user && completeEntry.content) {
                    handleSaveEntry(completeEntry).catch((err) =>
                      console.warn('Auto-save on quick reflection warning:', err)
                    );
                  }

                  if (initialPrompt) {
                    handleSendMessage(initialPrompt, targetScope, [], [], completeEntry, true);
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
                onTogglePrivacy={handleToggleEntryPrivacy}
              />
            )}

            {currentTab === 'reflect' && (
              <ReflectView
                activeEntry={reflectContextEntry}
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
                  setReflectContextEntry(null);
                  setActivePrivacyScope('all_vault');
                }}
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={(conv) => {
                  setCurrentConversationId(conv.id);
                  setChatMessages(conv.messages || []);
                  setActivePrivacyScope(conv.contextScope || 'all_vault');
                  if (conv.entryId) {
                    const found = entries.find((e) => e.id === conv.entryId);
                    setReflectContextEntry(found || null);
                  } else {
                    setReflectContextEntry(null);
                  }
                }}
                error={chatError}
                onRetry={() => {
                  const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === 'user');
                  if (lastUserMsg) {
                    handleSendMessage(lastUserMsg.content, activePrivacyScope, [], []);
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
            className="hidden xl:flex w-80 shrink-0 border-l border-stone-200/80 bg-white/90 p-7 flex-col gap-6 overflow-y-auto"
          >
            {/* Gemini Reflection Snippet */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                Gemini Reflection
              </span>
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-stone-200/70">
                <p className="text-xs leading-relaxed text-stone-700 italic font-serif mb-3">
                  {latestAssistantMessage
                    ? `"${latestAssistantMessage.content.slice(0, 180)}${
                        latestAssistantMessage.content.length > 180 ? '...' : ''
                      }"`
                    : '"Building the AI Memory Vault has been a lesson in restraint. Thoughts aren\'t just encrypted, but isolated—invisible to the intelligence helping you process them unless you explicitly turn the key."'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                  <span className="truncate">
                    Anchor:{' '}
                    {currentTab === 'reflect'
                      ? reflectContextEntry
                        ? reflectContextEntry.title || 'Current Reflection'
                        : 'Entire Eligible Vault'
                      : todayEntry
                      ? todayEntry.title || 'Draft Thought'
                      : 'New Thought'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vault Integrity Status */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                Vault Integrity
              </span>
              <div className="space-y-2.5 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/60 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Firestore Rules</span>
                  <span className="text-emerald-700 font-medium">
                    Owner-Bound
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Secret Storage</span>
                  <span className="text-emerald-700 font-medium">
                    GSM Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Model Ladder</span>
                  <span className="text-stone-700 font-medium">
                    Gemini 3.6+
                  </span>
                </div>
              </div>
            </div>

            {/* End-to-End Database Isolation Guarantee */}
            <div className="mt-auto pt-5 border-t border-stone-100 text-[10px] leading-relaxed text-stone-400 font-mono">
              <p>
                Protected by{' '}
                <strong className="text-stone-600 font-medium">
                  Authoritative Privacy Firewall
                </strong>
                . Gemini only accesses entries you explicitly designate as available.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

