export type PrivacyScope = 'current' | 'selected' | 'date_range' | 'all_vault';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  mood: string;
  isGeminiPrivate: boolean; // CRITICAL: If true, never sent to Gemini
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  entryId?: string | null;
  title: string;
  contextScope: PrivacyScope;
  includedMemoryIds: string[];
  messages: ChatMessage[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeInsight {
  name: string;
  description: string;
  evidence: string;
  relatedEntryIds: string[];
}

export interface UserPreferences {
  defaultPrivacyScope: PrivacyScope;
  readingWidth: 'standard' | 'wide';
  autoSaveEnabled: boolean;
}
