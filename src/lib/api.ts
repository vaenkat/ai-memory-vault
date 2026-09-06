import { ChatMessage, JournalEntry, PrivacyScope, ThemeInsight } from '../types';
import { auth } from './firebase';

export interface ChatResponse {
  reply: string;
  modelUsed: string;
  eligibleMemoriesUsedCount: number;
  scope: string;
  isFallback?: boolean;
  provider?: 'gemini' | 'local_fallback';
}

export interface ReflectionResponse {
  reflection: string;
  modelUsed: string;
  eligibleMemoriesCount: number;
  note?: string;
  isFallback?: boolean;
  provider?: 'gemini' | 'local_fallback';
}

export interface ThemesResponse {
  themes: ThemeInsight[];
  modelUsed?: string;
  analyzedCount?: number;
  message?: string;
  note?: string;
  isFallback?: boolean;
  provider?: 'gemini' | 'local_fallback';
}

/**
 * Strict Privacy Classifier: Returns true if an entry or memory item is classified
 * as private under ANY representation (boolean, string, numeric, tag, or alternative property).
 *
 * INVARIANT: ZERO content from any private entry may EVER enter a Gemini prompt or request.
 */
export function isEntryClassifiedPrivate(entry: any): boolean {
  if (!entry || typeof entry !== 'object') return false;

  if (entry.isGeminiPrivate === true || entry.isPrivate === true || entry.private === true || entry.isSecret === true) {
    return true;
  }

  const strGemini = String(entry.isGeminiPrivate ?? '').toLowerCase().trim();
  if (strGemini === 'true' || strGemini === '1' || strGemini === 'yes') return true;

  const strPrivate = String(entry.isPrivate ?? '').toLowerCase().trim();
  if (strPrivate === 'true' || strPrivate === '1' || strPrivate === 'yes') return true;

  const strGeneral = String(entry.private ?? '').toLowerCase().trim();
  if (strGeneral === 'true' || strGeneral === '1' || strGeneral === 'yes') return true;

  if (entry.isGeminiPrivate === 1 || entry.isPrivate === 1 || entry.private === 1) return true;

  if (Array.isArray(entry.tags) && entry.tags.some((t: any) => typeof t === 'string' && (t.toLowerCase() === 'private' || t.toLowerCase() === 'secret'))) {
    return true;
  }

  return false;
}

/**
 * Filter memories client-side before sending to server as defense-in-depth,
 * ensuring private entries never leave the client for Gemini.
 */
function filterEligibleMemories(memories: JournalEntry[]): JournalEntry[] {
  return memories.filter((m) => m && !isEntryClassifiedPrivate(m));
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-User-Id'] = user.uid;
    }
  } catch (err) {
    console.warn('Could not get auth headers:', err);
  }
  return headers;
}

export async function sendMessageToGemini(
  messages: ChatMessage[],
  contextScope: PrivacyScope = 'all_vault',
  allMemories: JournalEntry[],
  activeEntry?: JournalEntry | null,
  selectedMemoryIds: string[] = [],
  selectedLabels: string[] = []
): Promise<ChatResponse> {
  // Reconcile allMemories with the authoritative activeEntry state
  // to ensure any background latency or un-fired snapshot cannot introduce stale data
  const reconciledMemories = allMemories.map((m) => {
    if (activeEntry && m.id === activeEntry.id) {
      return {
        ...m,
        title: activeEntry.title,
        content: activeEntry.content,
        isGeminiPrivate: activeEntry.isGeminiPrivate,
        updatedAt: activeEntry.updatedAt,
      };
    }
    return m;
  });

  // Determine memory context based on selected PrivacyScope
  let memoriesToSend: JournalEntry[] = [];

  if (contextScope === 'all_vault') {
    // 1. ENTIRE ELIGIBLE VAULT (Default):
    // Automatically includes ALL memories available to Gemini.
    // Private memories are automatically excluded by filterEligibleMemories.
    memoriesToSend = filterEligibleMemories(reconciledMemories);
  } else if (contextScope === 'selected') {
    // 2. SPECIFIC THOUGHTS:
    // Only specifically chosen memories; private entries are strictly barred.
    memoriesToSend = reconciledMemories.filter(
      (m) => selectedMemoryIds.includes(m.id) && !isEntryClassifiedPrivate(m)
    );
  } else if (contextScope === 'by_label') {
    // 3. BY LABEL:
    // Only eligible memories matching selected labels; private entries strictly excluded.
    memoriesToSend = reconciledMemories.filter((m) => {
      if (isEntryClassifiedPrivate(m)) return false;
      if (!selectedLabels || selectedLabels.length === 0) return false;
      const entryTags = (m.tags || []).map((t) => t.toLowerCase().trim());
      return selectedLabels.some((lbl) => entryTags.includes(lbl.toLowerCase().trim()));
    });
  } else if (contextScope === 'current') {
    // 4. CURRENT THOUGHT ONLY:
    // Gemini has zero access to past memories; only current draft is provided.
    memoriesToSend = [];
  } else if (contextScope === 'date_range') {
    // Backward compatibility: Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    memoriesToSend = filterEligibleMemories(reconciledMemories).filter(
      (m) => new Date(m.createdAt) >= thirtyDaysAgo
    );
  }

  // Ensure activeEntry is NEVER duplicated in contextMemories
  if (activeEntry?.id) {
    memoriesToSend = memoriesToSend.filter((m) => m.id !== activeEntry.id);
  }

  // Ensure activeEntry is NEVER sent if marked private in ANY format
  const isActivePrivate = isEntryClassifiedPrivate(activeEntry);
  const safeActiveEntry =
    activeEntry && !isActivePrivate && typeof activeEntry.content === 'string' && activeEntry.content.trim()
      ? {
          id: activeEntry.id,
          title: activeEntry.title,
          content: activeEntry.content,
          isGeminiPrivate: false,
        }
      : activeEntry && isActivePrivate && activeEntry.id
      ? {
          id: activeEntry.id,
          title: activeEntry.title,
          content: '',
          isGeminiPrivate: true,
        }
      : null;

  // Track private entry IDs to ensure backend quarantine
  const privateEntryIds: string[] = [];
  if (activeEntry?.id && isActivePrivate) {
    privateEntryIds.push(activeEntry.id);
  }
  allMemories.forEach((m) => {
    if (m?.id && isEntryClassifiedPrivate(m)) {
      privateEntryIds.push(m.id);
    }
  });

  const payload = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    contextMemories: memoriesToSend.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      isGeminiPrivate: m.isGeminiPrivate,
      createdAt: m.createdAt,
    })),
    contextScope,
    activeEntry: safeActiveEntry,
    privateEntryIds,
    userId: auth.currentUser?.uid || undefined,
  };

  const headers = await getAuthHeaders();

  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Gemini chat request failed (${response.status})`);
  }

  return response.json();
}

export async function requestReflection(
  currentEntry: JournalEntry,
  allMemories: JournalEntry[],
  contextScope: PrivacyScope = 'all_vault',
  focusArea: string = 'general',
  selectedMemoryIds: string[] = [],
  selectedLabels: string[] = []
): Promise<ReflectionResponse> {
  if (isEntryClassifiedPrivate(currentEntry)) {
    throw new Error('This entry is classified as 🔒 Private. The AI Privacy Firewall strictly prohibits sending private entries to Gemini.');
  }

  let memoriesToSend: JournalEntry[] = [];
  if (contextScope === 'all_vault') {
    memoriesToSend = filterEligibleMemories(allMemories);
  } else if (contextScope === 'selected') {
    memoriesToSend = allMemories.filter(
      (m) => selectedMemoryIds.includes(m.id) && !isEntryClassifiedPrivate(m)
    );
  } else if (contextScope === 'by_label') {
    memoriesToSend = allMemories.filter((m) => {
      if (isEntryClassifiedPrivate(m)) return false;
      if (!selectedLabels || selectedLabels.length === 0) return false;
      const entryTags = (m.tags || []).map((t) => t.toLowerCase().trim());
      return selectedLabels.some((lbl) => entryTags.includes(lbl.toLowerCase().trim()));
    });
  } else if (contextScope === 'current') {
    memoriesToSend = [];
  } else if (contextScope === 'date_range') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    memoriesToSend = filterEligibleMemories(allMemories).filter(
      (m) => new Date(m.createdAt) >= thirtyDaysAgo
    );
  }

  // Ensure currentEntry is never duplicated in historical memories
  if (currentEntry?.id) {
    memoriesToSend = memoriesToSend.filter((m) => m.id !== currentEntry.id);
  }

  const payload = {
    currentEntry: {
      id: currentEntry.id,
      title: currentEntry.title,
      content: currentEntry.content,
      isGeminiPrivate: currentEntry.isGeminiPrivate,
      createdAt: currentEntry.createdAt,
    },
    memories: memoriesToSend.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      isGeminiPrivate: m.isGeminiPrivate,
      createdAt: m.createdAt,
    })),
    contextScope,
    focusArea,
    userId: auth.currentUser?.uid || undefined,
  };

  const headers = await getAuthHeaders();

  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Gemini reflection failed (${response.status})`);
  }

  return response.json();
}

export async function analyzeVaultThemes(memories: JournalEntry[]): Promise<ThemesResponse> {
  const eligible = filterEligibleMemories(memories);

  const payload = {
    memories: eligible.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      isGeminiPrivate: m.isGeminiPrivate,
      createdAt: m.createdAt,
    })),
    userId: auth.currentUser?.uid || undefined,
  };

  const headers = await getAuthHeaders();

  const response = await fetch('/api/gemini/analyze-themes', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Theme analysis failed (${response.status})`);
  }

  return response.json();
}
