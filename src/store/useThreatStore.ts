import { create } from 'zustand';
import api from '../lib/axios';

export interface Threat {
  id: number;
  article_url: string;
  author: string;
  comment_text: string;
  timestamp: string | null;
  severity: 'low' | 'medium' | 'high';
  matched_patterns: string;
  flagged_at: string;
  scan_id?: number | null;
}

export interface ScannedComment {
  id: number;
  article_url: string;
  article_title: string;
  author: string;
  comment_text: string;
  timestamp: string | null;
  severity: string;
  matched_patterns: string;
  scanned_at: string;
  scan_id?: number | null;
}

export interface Article {
  url: string;
  title: string;
  source: string;
  scraped_at: string;
}

export interface ThreatStats {
  high: number;
  medium: number;
  low: number;
  total: number;
  comments_scanned: number;
}

export interface ScanSession {
  id: number;
  keyword: string;
  category: string;
  status: 'running' | 'completed' | 'error';
  started_at: string;
  completed_at: string | null;
  articles_found: number;
  comments_scanned: number;
  threats_high: number;
  threats_medium: number;
  threats_low: number;
  error_message: string | null;
}

export interface Source {
  domain: string;
  url: string;
  status: 'online' | 'offline' | 'unknown';
}

interface ThreatStore {
  threats: Threat[];
  allComments: ScannedComment[];
  articles: Article[];
  stats: ThreatStats;
  scanSessions: ScanSession[];
  sources: Source[];
  sourcesStats: { online: number; total: number };
  isScanning: boolean;
  activeKeyword: string | null;
  scanError: string | null;
  articlesFound: number;
  commentsScanned: number;
  threatsFound: number;
  progressMessage: string;

  // Actions
  fetchThreats: (severity?: string, search?: string) => Promise<void>;
  fetchAllComments: (severity?: string, search?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchArticles: () => Promise<void>;
  fetchScanSessions: () => Promise<void>;
  fetchScanDetail: (id: number) => Promise<{ session: ScanSession; comments: ScannedComment[]; flagged: Threat[] }>;
  deleteScanSession: (id: number) => Promise<void>;
  triggerScan: (keyword: string, category?: string) => Promise<void>;
  pollScanStatus: () => Promise<void>;
  clearDatabase: () => Promise<void>;
  fetchSources: () => Promise<void>;
}

export const useThreatStore = create<ThreatStore>((set, get) => {
  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingInterval = setInterval(async () => {
      try {
        const response = await api.get('/api/status');
        const status = response.data;

        set({
          isScanning: status.is_scanning,
          activeKeyword: status.active_keyword,
          scanError: status.error || null,
          articlesFound: status.articles_found || 0,
          commentsScanned: status.comments_scanned || 0,
          threatsFound: status.threats_found || 0,
          progressMessage: status.progress_message || '',
        });

        if (!status.is_scanning) {
          stopPolling();
          get().fetchThreats();
          get().fetchAllComments();
          get().fetchStats();
          get().fetchArticles();
          get().fetchScanSessions();
        }
      } catch (err) {
        console.error('Error polling scan status:', err);
        stopPolling();
        set({ isScanning: false, scanError: 'Connection to scan server lost.' });
      }
    }, 2000);
  };

  return {
    threats: [],
    allComments: [],
    articles: [],
    stats: { high: 0, medium: 0, low: 0, total: 0, comments_scanned: 0 },
    scanSessions: [],
    sources: [],
    sourcesStats: { online: 0, total: 0 },
    isScanning: false,
    activeKeyword: null,
    scanError: null,
    articlesFound: 0,
    commentsScanned: 0,
    threatsFound: 0,
    progressMessage: 'Idle',

    fetchThreats: async (severity, search) => {
      try {
        const params: Record<string, string> = {};
        if (severity) params.severity = severity;
        if (search) params.search = search;
        const response = await api.get('/api/results', { params });
        set({ threats: response.data });
      } catch (err) {
        console.error('Failed to fetch threats:', err);
      }
    },

    fetchAllComments: async (severity, search) => {
      try {
        const params: Record<string, string> = {};
        if (severity) params.severity = severity;
        if (search) params.search = search;
        const response = await api.get('/api/comments', { params });
        set({ allComments: response.data });
      } catch (err) {
        console.error('Failed to fetch all comments:', err);
      }
    },

    fetchStats: async () => {
      try {
        const response = await api.get('/api/stats');
        set({ stats: response.data });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    },

    fetchArticles: async () => {
      try {
        const response = await api.get('/api/articles');
        set({ articles: response.data });
      } catch (err) {
        console.error('Failed to fetch articles:', err);
      }
    },

    fetchScanSessions: async () => {
      try {
        const response = await api.get('/api/scans');
        set({ scanSessions: response.data });
      } catch (err) {
        console.error('Failed to fetch scan sessions:', err);
      }
    },

    fetchScanDetail: async (id: number) => {
      try {
        const response = await api.get(`/api/scans/${id}`);
        return response.data;
      } catch (err) {
        console.error(`Failed to fetch scan details for session ${id}:`, err);
        throw err;
      }
    },

    deleteScanSession: async (id: number) => {
      try {
        await api.delete(`/api/scans/${id}`);
        get().fetchScanSessions();
        get().fetchThreats();
        get().fetchAllComments();
        get().fetchStats();
        get().fetchArticles();
      } catch (err) {
        console.error(`Failed to delete scan session ${id}:`, err);
      }
    },

    triggerScan: async (keyword: string, category?: string) => {
      set({ isScanning: true, activeKeyword: keyword, scanError: null, progressMessage: 'Initializing scan...' });
      try {
        await api.post('/api/scan', { keyword, category });
        startPolling();
        get().fetchScanSessions();
      } catch (err: any) {
        const errMsg = err.response?.data?.detail || 'Failed to start scan.';
        set({ isScanning: false, scanError: errMsg });
        throw new Error(errMsg);
      }
    },

    pollScanStatus: async () => {
      try {
        const response = await api.get('/api/status');
        const status = response.data;
        set({
          isScanning: status.is_scanning,
          activeKeyword: status.active_keyword,
          scanError: status.error || null,
          articlesFound: status.articles_found || 0,
          commentsScanned: status.comments_scanned || 0,
          threatsFound: status.threats_found || 0,
          progressMessage: status.progress_message || 'Idle',
        });
        if (status.is_scanning) {
          startPolling();
        }
      } catch (err) {
        console.error('Failed to fetch scan status:', err);
      }
    },

    clearDatabase: async () => {
      try {
        await api.delete('/api/clear');
        set({
          threats: [],
          allComments: [],
          articles: [],
          scanSessions: [],
          sources: [],
          sourcesStats: { online: 0, total: 0 },
          stats: { high: 0, medium: 0, low: 0, total: 0, comments_scanned: 0 },
        });
      } catch (err) {
        console.error('Failed to clear database:', err);
      }
    },

    fetchSources: async () => {
      try {
        const response = await api.get('/api/sources');
        set({
          sources: response.data.sources || [],
          sourcesStats: {
            online: response.data.online || 0,
            total: response.data.total || 0,
          },
        });
      } catch (err) {
        console.error('Failed to fetch sources:', err);
      }
    },
  };
});
