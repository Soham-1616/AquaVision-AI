import { create } from 'zustand';
import type {
  AnalysisSession,
  AppSettings,
  BackendCapabilities,
} from '@/types';

// ============================================================================
// App Store — Global Application State
// ============================================================================

interface AppState {
  // Backend status
  backendCapabilities: BackendCapabilities;
  isDemo: boolean;

  // Analysis sessions
  sessions: AnalysisSession[];
  activeSessionId: string | null;

  // Settings
  settings: AppSettings;

  // Mobile nav
  sidebarOpen: boolean;

  // Actions
  setBackendCapabilities: (caps: BackendCapabilities) => void;
  setIsDemo: (demo: boolean) => void;
  addSession: (session: AnalysisSession) => void;
  updateSession: (id: string, updates: Partial<AnalysisSession>) => void;
  removeSession: (id: string) => void;
  clearSessions: () => void;
  setActiveSession: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const defaultSettings: AppSettings = {
  apiBaseUrl: '/api',
  defaultEnhancementMethod: 'auto',
  defaultConfidenceThreshold: 0.5,
  defaultAnalysisPage: '/image-processing',
  showDemoLabels: true,
  imageComparisonMode: 'slider',
};

const defaultCapabilities: BackendCapabilities = {
  connected: false,
  enhancementModels: [],
  detectionModels: [],
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedClasses: [],
};

// Load settings from localStorage
function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('aquavision-settings');
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return defaultSettings;
}

// Load sessions from localStorage (metadata only, no large blobs)
function loadSessions(): AnalysisSession[] {
  try {
    const stored = localStorage.getItem('aquavision-sessions');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function persistSessions(sessions: AnalysisSession[]) {
  try {
    // Store only metadata — strip large data URLs
    const light = sessions.map((s) => ({
      ...s,
      // keep URLs if they're short (API URLs), strip data: URLs
      originalImageUrl: s.originalImageUrl?.startsWith('data:') ? undefined : s.originalImageUrl,
    }));
    localStorage.setItem('aquavision-sessions', JSON.stringify(light));
  } catch {
    // quota exceeded or other error
  }
}

function persistSettings(settings: AppSettings) {
  try {
    localStorage.setItem('aquavision-settings', JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  backendCapabilities: defaultCapabilities,
  isDemo: true,
  sessions: loadSessions(),
  activeSessionId: null,
  settings: loadSettings(),
  sidebarOpen: false,

  setBackendCapabilities: (caps) => set({ backendCapabilities: caps }),
  setIsDemo: (demo) => set({ isDemo: demo }),

  addSession: (session) => {
    const sessions = [session, ...get().sessions];
    persistSessions(sessions);
    set({ sessions });
  },

  updateSession: (id, updates) => {
    const sessions = get().sessions.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    persistSessions(sessions);
    set({ sessions });
  },

  removeSession: (id) => {
    const sessions = get().sessions.filter((s) => s.id !== id);
    persistSessions(sessions);
    set({ sessions });
  },

  clearSessions: () => {
    persistSessions([]);
    set({ sessions: [] });
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  updateSettings: (newSettings) => {
    const settings = { ...get().settings, ...newSettings };
    persistSettings(settings);
    set({ settings });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
