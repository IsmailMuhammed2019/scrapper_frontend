"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Clock,
  User,
  Filter,
  Database,
  Activity,
  CheckCircle2,
  Eye,
  Trash2,
  Newspaper,
  Lock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Shield,
  Globe,
  Wifi,
  WifiOff,
  ArrowLeft,
  LayoutDashboard,
  ListFilter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useThreatStore, ScannedComment, ScanSession } from "../store/useThreatStore";

// ─── Types ───────────────────────────────────────────────────────────────────
type View = "dashboard" | "filters" | "sources";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].slice(0, 40);
  }
}

function highlightText(text: string, patterns: string | null | undefined) {
  if (!patterns || !text) return <>{text}</>;

  const keywords: string[] = [];
  patterns.split(",").forEach((p) => {
    const trimmed = p.trim();
    // Extract words from \bword\b style regex patterns
    const matches = trimmed.match(/\\b(\w+)\\b/g);
    if (matches) {
      matches.forEach((m) => {
        const word = m.replace(/\\b/g, "");
        if (word) keywords.push(word);
      });
    } else {
      // Fallback: strip common regex metacharacters
      const clean = trimmed.replace(/[\\b()?.*+[\]{}|^$]/g, "").trim();
      if (clean.length > 2) keywords.push(clean);
    }
  });

  if (!keywords.length) return <>{text}</>;

  try {
    const escaped = keywords.map((k) =>
      k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
            <mark
              key={i}
              className="bg-yellow-200 text-yellow-900 rounded px-0.5 font-semibold not-italic"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Home() {
  const {
    threats,
    allComments,
    articles,
    stats,
    scanSessions,
    sources,
    sourcesStats,
    isScanning,
    activeKeyword,
    scanError,
    articlesFound,
    commentsScanned,
    threatsFound,
    progressMessage,
    fetchThreats,
    fetchAllComments,
    fetchStats,
    fetchArticles,
    fetchScanSessions,
    fetchScanDetail,
    deleteScanSession,
    triggerScan,
    pollScanStatus,
    clearDatabase,
    fetchSources,
  } = useThreatStore();

  // ── Dashboard state ──────────────────────────────────────────────────────
  const [inputKeyword, setInputKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Executive Protection");
  const [customCategory, setCustomCategory] = useState("");
  const [activeTab, setActiveTab] = useState<"flagged" | "all">("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedComment, setExpandedComment] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showArticles, setShowArticles] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<{
    session: ScanSession;
    comments: ScannedComment[];
    flagged: any[];
  } | null>(null);
  const [modalSeverityFilter, setModalSeverityFilter] = useState("all");
  const [modalSearchFilter, setModalSearchFilter] = useState("");

  // ── Navigation state ─────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<View>("dashboard");

  // ── Filters view state ───────────────────────────────────────────────────
  const [selectedFilterSession, setSelectedFilterSession] =
    useState<ScanSession | null>(null);
  const [filterDetailData, setFilterDetailData] = useState<ScannedComment[]>([]);
  const [filterDetailLoading, setFilterDetailLoading] = useState(false);
  const [filterDetailSeverity, setFilterDetailSeverity] = useState("all");
  const [filterDetailSearch, setFilterDetailSearch] = useState("");

  // ── Sources state ────────────────────────────────────────────────────────
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    fetchThreats();
    fetchAllComments();
    fetchStats();
    fetchArticles();
    fetchScanSessions();
    pollScanStatus();
  }, []);

  // Load sources when that tab is opened
  useEffect(() => {
    if (currentView === "sources") {
      setSourcesLoading(true);
      fetchSources().finally(() => setSourcesLoading(false));
    }
  }, [currentView]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKeyword.trim() || isScanning) return;
    try {
      setActiveTab("all");
      const category =
        selectedCategory === "Custom" ? customCategory.trim() : selectedCategory;
      await triggerScan(inputKeyword.trim(), category);
      setInputKeyword("");
      if (selectedCategory === "Custom") {
        setCustomCategory("");
        setSelectedCategory("Executive Protection");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickSearch = async (keyword: string) => {
    if (isScanning) return;
    try {
      setActiveTab("all");
      await triggerScan(keyword, "Executive Protection");
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenScanDetail = async (id: number) => {
    setShowModal(true);
    setModalLoading(true);
    setModalSeverityFilter("all");
    setModalSearchFilter("");
    try {
      const data = await fetchScanDetail(id);
      setModalData(data);
    } catch (err) {
      console.error(err);
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenFilterSession = async (session: ScanSession) => {
    setSelectedFilterSession(session);
    setFilterDetailLoading(true);
    setFilterDetailSeverity("all");
    setFilterDetailSearch("");
    try {
      const data = await fetchScanDetail(session.id);
      setFilterDetailData(data.comments || []);
    } catch (err) {
      console.error(err);
      setFilterDetailData([]);
    } finally {
      setFilterDetailLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const getDuration = (started: string, completed: string | null) => {
    if (!completed) return "Running...";
    try {
      const diffMs =
        new Date(completed).getTime() - new Date(started).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s`;
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      return `${mins}m ${secs}s`;
    } catch {
      return "—";
    }
  };

  const displayComments: ScannedComment[] =
    activeTab === "flagged"
      ? threats.map((t) => ({
          id: t.id,
          article_url: t.article_url,
          article_title: t.article_url,
          author: t.author,
          comment_text: t.comment_text,
          timestamp: t.timestamp,
          severity: t.severity,
          matched_patterns: t.matched_patterns,
          scanned_at: t.flagged_at,
        }))
      : allComments;

  const filteredComments = displayComments.filter((c) => {
    const matchesSeverity =
      selectedSeverity === "" ||
      (selectedSeverity === "safe"
        ? c.severity === "none"
        : c.severity === selectedSeverity);
    const matchesSearch =
      filterSearch === "" ||
      c.comment_text.toLowerCase().includes(filterSearch.toLowerCase()) ||
      c.author.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (c.article_title || "").toLowerCase().includes(filterSearch.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const filteredModalComments =
    modalData?.comments.filter((c) => {
      const matchesSeverity =
        modalSeverityFilter === "all" ||
        (modalSeverityFilter === "safe"
          ? c.severity === "none"
          : c.severity === modalSeverityFilter);
      const matchesSearch =
        modalSearchFilter === "" ||
        c.comment_text
          .toLowerCase()
          .includes(modalSearchFilter.toLowerCase()) ||
        c.author.toLowerCase().includes(modalSearchFilter.toLowerCase());
      return matchesSeverity && matchesSearch;
    }) || [];

  const filteredDetailComments = filterDetailData.filter((c) => {
    const matchesSeverity =
      filterDetailSeverity === "all" ||
      (filterDetailSeverity === "safe"
        ? c.severity === "none"
        : c.severity === filterDetailSeverity);
    const matchesSearch =
      filterDetailSearch === "" ||
      c.comment_text
        .toLowerCase()
        .includes(filterDetailSearch.toLowerCase()) ||
      c.author.toLowerCase().includes(filterDetailSearch.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const chartData = [
    { name: "High", count: stats.high, color: "#dc2626" },
    { name: "Medium", count: stats.medium, color: "#d97706" },
    { name: "Low", count: stats.low, color: "#2563eb" },
  ];

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          border: "border-l-red-500",
          badge: "bg-red-50 text-red-700 border border-red-200",
        };
      case "medium":
        return {
          border: "border-l-amber-500",
          badge: "bg-amber-50 text-amber-700 border border-amber-200",
        };
      case "low":
        return {
          border: "border-l-blue-500",
          badge: "bg-blue-50 text-blue-700 border border-blue-200",
        };
      default:
        return {
          border: "border-l-gray-200",
          badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        };
    }
  };

  const getSeverityLabel = (s: string) =>
    s === "none" ? "Safe" : s.charAt(0).toUpperCase() + s.slice(1);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "—";
    try {
      const num = Number(isoStr);
      const date = isNaN(num) ? new Date(isoStr) : new Date(num * 1000);
      return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-900 grid-bg flex flex-col">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-red-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-50 rounded-lg border border-red-100">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
                AEGIS
                <span className="text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 tracking-wider">
                  THREAT PRO
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 leading-none">
                Executive &amp; Organization Protection Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs">
              {isScanning ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-red-600 font-medium">
                    Scanning: {activeKeyword}
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-500 font-medium">System Idle</span>
                </>
              )}
            </div>

            <button
              onClick={() => {
                fetchThreats();
                fetchAllComments();
                fetchStats();
                fetchArticles();
                fetchScanSessions();
              }}
              className="p-2 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-all"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${isScanning ? "animate-spin text-red-500" : ""}`}
              />
            </button>

            <button
              onClick={clearDatabase}
              className="p-2 border border-gray-200 hover:border-red-200 bg-white hover:bg-red-50 rounded-lg transition-all"
              title="Clear all data"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1">
          {(
            [
              { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
              { id: "filters", label: "Filters", Icon: ListFilter },
              { id: "sources", label: "Sources", Icon: Globe },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setCurrentView(id);
                if (id === "filters") setSelectedFilterSession(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === id
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          DASHBOARD VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {currentView === "dashboard" && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-6">

          {/* Top row: Search + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search panel */}
            <div
              className={`col-span-1 lg:col-span-2 glass-panel rounded-2xl p-6 transition-all duration-300 ${isScanning ? "pulsing-rose-glow" : ""}`}
            >
              <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-red-500" />
                Initialize Threat Protection Scan
              </h2>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Enter a name, brand, or organization. Aegis queries Google News
                RSS &amp; Reddit and scans comment sections for threat
                signatures.
              </p>

              <form
                onSubmit={handleScanSubmit}
                className="flex flex-col md:flex-row gap-3 mb-4"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="keyword-input"
                    type="text"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    placeholder="e.g. Elon Musk, Tim Cook, Apple Inc..."
                    disabled={isScanning}
                    className="w-full bg-white border border-gray-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      if (e.target.value !== "Custom") setCustomCategory("");
                    }}
                    disabled={isScanning}
                    className="bg-white border border-gray-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl py-2.5 px-3 text-sm outline-none transition-all disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value="Executive Protection">Executive Protection</option>
                    <option value="Brand Monitoring">Brand Monitoring</option>
                    <option value="Event Security">Event Security</option>
                    <option value="Political Figure">Political Figure</option>
                    <option value="Custom">Custom Category...</option>
                  </select>

                  <button
                    type="submit"
                    disabled={
                      isScanning ||
                      !inputKeyword.trim() ||
                      (selectedCategory === "Custom" && !customCategory.trim())
                    }
                    className="bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-5 py-2.5 font-medium text-sm transition-all flex items-center gap-2 shadow-sm hover:shadow-red-100 hover:shadow-md shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      "Launch Scan"
                    )}
                  </button>
                </div>
              </form>

              {selectedCategory === "Custom" && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name..."
                    disabled={isScanning}
                    className="w-full md:w-1/2 bg-white border border-gray-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 rounded-xl py-2 px-3 text-sm outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  />
                </div>
              )}

              {/* Progress */}
              {isScanning && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-red-600 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                    <span className="truncate">{progressMessage}</span>
                  </div>
                  <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-500 h-1.5 rounded-full animate-pulse w-3/4" />
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                    <span>
                      📰 Articles:{" "}
                      <strong className="text-gray-700">{articlesFound}</strong>
                    </span>
                    <span>
                      💬 Comments:{" "}
                      <strong className="text-gray-700">{commentsScanned}</strong>
                    </span>
                    <span>
                      ⚠ Threats:{" "}
                      <strong className="text-red-600">{threatsFound}</strong>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-2">
                  Quick Examples:
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Elon Musk", "Tim Cook", "Jeff Bezos", "Artificial Intelligence"].map(
                    (kw) => (
                      <button
                        key={kw}
                        onClick={() => handleQuickSearch(kw)}
                        disabled={isScanning}
                        className="text-xs bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 disabled:opacity-40 text-gray-600 hover:text-gray-900 rounded-full px-3 py-1.5 transition-all shadow-sm"
                      >
                        + {kw}
                      </button>
                    )
                  )}
                </div>
              </div>

              {scanError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="col-span-1 glass-panel rounded-2xl p-6 flex flex-col">
              <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Threat Distribution
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Severity counts, flagged only
              </p>
              <div className="flex-1 min-h-[110px] flex items-center">
                {mounted && stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ left: -20, right: 10, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                        contentStyle={{
                          background: "#fff",
                          borderColor: "#e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-gray-400 flex flex-col items-center gap-2 w-full py-4">
                    <Database className="w-8 h-8 text-gray-200" />
                    No flagged threats yet
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 pt-3 mt-2 text-[11px] text-gray-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" /> Database
                </span>
                <span className="font-mono">threat_monitor.db</span>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Comments Scanned</p>
                <h3 className="text-2xl font-bold mt-0.5 text-gray-900">
                  {stats.comments_scanned}
                </h3>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Flagged</p>
                <h3 className="text-2xl font-bold mt-0.5 text-gray-900">
                  {stats.total}
                </h3>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {[
              { sev: "high", label: "High Threats", value: stats.high, color: "red", Icon: ShieldAlert },
              { sev: "medium", label: "Med Threats", value: stats.medium, color: "amber", Icon: AlertTriangle },
              { sev: "low", label: "Low Threats", value: stats.low, color: "blue", Icon: Eye },
            ].map(({ sev, label, value, color, Icon }) => (
              <div
                key={sev}
                onClick={() => {
                  setSelectedSeverity(selectedSeverity === sev ? "" : sev);
                  setActiveTab("flagged");
                }}
                className={`border rounded-xl p-4 shadow-sm flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  selectedSeverity === sev
                    ? `bg-${color}-50 border-${color}-300 shadow-${color}-100 shadow-md`
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow"
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-medium flex items-center gap-1 ${selectedSeverity === sev ? `text-${color}-600` : "text-gray-400"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500`} />
                    {label}
                  </p>
                  <h3
                    className={`text-2xl font-bold mt-0.5 ${
                      color === "red"
                        ? "text-red-600"
                        : color === "amber"
                          ? "text-amber-600"
                          : "text-blue-600"
                    }`}
                  >
                    {value}
                  </h3>
                </div>
                <div
                  className={`p-2 rounded-lg ${selectedSeverity === sev ? `bg-${color}-100` : "bg-gray-50"}`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      selectedSeverity === sev
                        ? color === "red"
                          ? "text-red-600"
                          : color === "amber"
                            ? "text-amber-600"
                            : "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Scan History */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50/60 transition-all"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Scan History &amp; Sessions ({scanSessions.length})
              </span>
              {showHistory ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showHistory && (
              <div className="overflow-x-auto">
                {scanSessions.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 bg-gray-50/80 text-gray-400 uppercase font-semibold tracking-wider">
                        <th className="px-6 py-3">Keyword</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Date / Time</th>
                        <th className="px-6 py-3 text-center">Articles</th>
                        <th className="px-6 py-3 text-center">Comments</th>
                        <th className="px-6 py-3 text-center">Threats (H/M/L)</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {scanSessions.map((session) => {
                        const totalThreats =
                          session.threats_high +
                          session.threats_medium +
                          session.threats_low;
                        return (
                          <tr
                            key={session.id}
                            className="hover:bg-gray-50/60 transition-colors align-middle"
                          >
                            <td className="px-6 py-4 font-semibold text-gray-800">
                              {session.keyword}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-600">
                                {session.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                              {formatDate(session.started_at)}
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                              {session.articles_found}
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                              {session.comments_scanned}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {totalThreats > 0 ? (
                                <div className="flex justify-center items-center gap-1">
                                  {session.threats_high > 0 && (
                                    <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-200">
                                      {session.threats_high}H
                                    </span>
                                  )}
                                  {session.threats_medium > 0 && (
                                    <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                                      {session.threats_medium}M
                                    </span>
                                  )}
                                  {session.threats_low > 0 && (
                                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                                      {session.threats_low}L
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-emerald-600 font-medium">
                                  None
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {session.status === "running" ? (
                                <span className="inline-flex items-center gap-1 text-red-600 font-medium animate-pulse">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                  Active
                                </span>
                              ) : session.status === "completed" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Done
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-red-600 font-medium"
                                  title={session.error_message || "Error occurred"}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Error
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenScanDetail(session.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-100 hover:bg-red-50 rounded-lg transition-all"
                                  title="View detailed comments"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteScanSession(session.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-100 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete scan record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                    <Database className="w-8 h-8 text-gray-200" />
                    No past scan sessions found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Articles collapsible */}
          {articles.length > 0 && (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowArticles(!showArticles)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50/60 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-gray-500" />
                  Articles Scanned ({articles.length})
                </span>
                {showArticles ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showArticles && (
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {articles.map((article, i) => (
                    <div
                      key={i}
                      className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-gray-50/60 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {article.title}
                        </p>
                        <p className="text-gray-400 font-mono text-[10px] truncate mt-0.5">
                          {article.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-400">
                          {formatDate(article.scraped_at)}
                        </span>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments panel */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl">
                <button
                  onClick={() => { setActiveTab("all"); setSelectedSeverity(""); }}
                  className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === "all"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  All Comments
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "all" ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                    {allComments.length}
                  </span>
                </button>
                <button
                  onClick={() => { setActiveTab("flagged"); setSelectedSeverity(""); }}
                  className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === "flagged"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Flagged Threats
                  {stats.total > 0 && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "flagged" ? "bg-white/20" : "bg-red-50 text-red-600"}`}>
                      {stats.total}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Filter by author, text, article..."
                    className="w-full bg-white border border-gray-200 focus:border-red-300 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none transition-all placeholder:text-gray-400"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                  {(activeTab === "all"
                    ? ["", "safe", "low", "medium", "high"]
                    : ["", "low", "medium", "high"]
                  ).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSelectedSeverity(sev)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        selectedSeverity === sev
                          ? sev === ""
                            ? "bg-gray-100 text-gray-700"
                            : sev === "safe"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : sev === "high"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : sev === "medium"
                                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                                  : "bg-blue-50 text-blue-600 border border-blue-200"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {sev === ""
                        ? "All"
                        : sev === "safe"
                          ? "Safe"
                          : sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredComments.length > 0 ? (
                filteredComments.map((comment) => {
                  const isExpanded = expandedComment === comment.id;
                  const style = getSeverityStyles(comment.severity);
                  return (
                    <div
                      key={comment.id}
                      className={`px-6 py-5 flex flex-col gap-3 transition-all border-l-4 hover:bg-gray-50/40 ${style.border}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${style.badge}`}>
                            {getSeverityLabel(comment.severity)}
                          </span>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-semibold text-gray-800">
                              {comment.author}
                            </span>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatDate(comment.scanned_at)}
                        </span>
                      </div>

                      {comment.article_title &&
                        comment.article_title !== comment.article_url && (
                          <p className="text-[11px] text-gray-400 font-medium truncate">
                            📰 {comment.article_title}
                          </p>
                        )}

                      <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed shadow-sm">
                        <p className={`${isExpanded ? "" : "line-clamp-3"} whitespace-pre-wrap`}>
                          {highlightText(comment.comment_text, comment.matched_patterns)}
                        </p>
                        {comment.comment_text.length > 200 && (
                          <button
                            onClick={() =>
                              setExpandedComment(isExpanded ? null : comment.id)
                            }
                            className="text-[10px] font-semibold text-red-500 hover:text-red-600 mt-2 block transition-all"
                          >
                            {isExpanded ? "Show less ↑" : "Show full comment ↓"}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-gray-400 shrink-0">Source:</span>
                          <a
                            href={comment.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-red-500 flex items-center gap-1 truncate max-w-xs font-mono text-[10px] transition-colors"
                          >
                            {comment.article_url
                              .replace(/https?:\/\/(www\.)?/, "")
                              .slice(0, 60)}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                        {comment.matched_patterns && comment.severity !== "none" && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-gray-400 shrink-0 font-medium">
                              Matched:
                            </span>
                            {comment.matched_patterns.split(",").map((pat, i) => (
                              <span
                                key={i}
                                className="text-[9px] font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100"
                              >
                                {pat.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Database className="w-10 h-10 text-gray-200" />
                  <h4 className="font-semibold text-sm text-gray-500">
                    {activeTab === "flagged"
                      ? "No Flagged Threats Found"
                      : "No Comments Yet"}
                  </h4>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    {filterSearch || selectedSeverity
                      ? "Try adjusting your filter or search term."
                      : activeTab === "flagged"
                        ? "No threats were detected. Switch to 'All Comments' to see what was scanned."
                        : "Run a scan above. All scraped comments will appear here regardless of threat level."}
                  </p>
                  {activeTab === "flagged" && allComments.length > 0 && (
                    <button
                      onClick={() => setActiveTab("all")}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                    >
                      View {allComments.length} scanned comments →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          FILTERS VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {currentView === "filters" && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-6">

          {/* ── Filters list ─────────────────────────────────────────────── */}
          {!selectedFilterSession && (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Filters
                </h2>
                <span className="text-xs text-gray-400">
                  {scanSessions.length} scan{scanSessions.length !== 1 ? "s" : ""}
                </span>
              </div>

              {scanSessions.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Database className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-400">
                    No scans yet. Run a scan from the Dashboard.
                  </p>
                </div>
              ) : (
                <>
                  {/* Column header */}
                  <div className="px-8 py-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50/60">
                    <span>Keyword</span>
                    <span>Daily #</span>
                  </div>

                  <ul className="divide-y divide-gray-100">
                    {scanSessions.map((session) => (
                      <li key={session.id}>
                        <button
                          onClick={() => handleOpenFilterSession(session)}
                          className="w-full flex items-center justify-between px-8 py-4 hover:bg-gray-50/70 transition-all group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 group-hover:bg-red-500 transition-colors shrink-0" />
                            <div>
                              <span className="text-sm font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                                {session.keyword}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400">
                                  {formatDate(session.started_at)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500">
                                  {session.category}
                                </span>
                                {session.status === "running" && (
                                  <span className="text-[10px] text-red-500 font-medium animate-pulse">
                                    ● Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Threat badges */}
                            <div className="flex items-center gap-1">
                              {session.threats_high > 0 && (
                                <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                                  {session.threats_high}H
                                </span>
                              )}
                              {session.threats_medium > 0 && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">
                                  {session.threats_medium}M
                                </span>
                              )}
                              {session.threats_low > 0 && (
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">
                                  {session.threats_low}L
                                </span>
                              )}
                            </div>
                            {/* Daily # box */}
                            <span className="min-w-[2.5rem] text-center border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-700 bg-white shadow-sm group-hover:border-red-300 transition-colors">
                              {session.comments_scanned}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* ── Filter detail view ──────────────────────────────────────── */}
          {selectedFilterSession && (
            <div className="flex flex-col gap-4">
              {/* Back + keyword heading */}
              <button
                onClick={() => {
                  setSelectedFilterSession(null);
                  setFilterDetailData([]);
                }}
                className="self-start flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Filters
              </button>

              {/* Keyword heading box — matches the wireframe */}
              <div className="glass-panel rounded-2xl px-8 py-5 text-center">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {selectedFilterSession.keyword}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(selectedFilterSession.started_at)} ·{" "}
                  {selectedFilterSession.comments_scanned} comment
                  {selectedFilterSession.comments_scanned !== 1 ? "s" : ""} scanned ·{" "}
                  {selectedFilterSession.threats_high +
                    selectedFilterSession.threats_medium +
                    selectedFilterSession.threats_low}{" "}
                  flagged
                </p>
              </div>

              {/* Filters for detail */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={filterDetailSearch}
                    onChange={(e) => setFilterDetailSearch(e.target.value)}
                    placeholder="Search comments or author..."
                    className="w-full bg-white border border-gray-200 focus:border-red-300 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none transition-all placeholder:text-gray-400"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                  {["all", "safe", "low", "medium", "high"].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setFilterDetailSeverity(sev)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                        filterDetailSeverity === sev
                          ? sev === "all"
                            ? "bg-gray-100 text-gray-700"
                            : sev === "safe"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : sev === "high"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : sev === "medium"
                                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                                  : "bg-blue-50 text-blue-600 border border-blue-200"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {sev === "all"
                        ? "All"
                        : sev === "safe"
                          ? "Safe"
                          : sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment list — wireframe format */}
              {filterDetailLoading ? (
                <div className="glass-panel rounded-2xl py-20 text-center flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-red-400 animate-spin" />
                  <p className="text-sm text-gray-400">Loading comments...</p>
                </div>
              ) : filteredDetailComments.length === 0 ? (
                <div className="glass-panel rounded-2xl py-20 text-center flex flex-col items-center gap-3">
                  <Database className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-400">No comments match the current filter.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredDetailComments.map((comment) => {
                    const domain = getDomain(comment.article_url);
                    const style = getSeverityStyles(comment.severity);
                    const isFlagged = comment.severity !== "none";
                    return (
                      <div
                        key={comment.id}
                        className={`glass-panel rounded-xl px-5 py-4 flex flex-col gap-1 border-l-4 transition-all hover:shadow-md ${style.border}`}
                      >
                        {/* Main line: Domain: "comment" (@author) */}
                        <p className="text-sm text-gray-800 leading-snug">
                          <span className="font-semibold text-gray-600">
                            {domain}:
                          </span>{" "}
                          <span className="text-gray-700">
                            &ldquo;
                            {isFlagged
                              ? highlightText(
                                  comment.comment_text,
                                  comment.matched_patterns
                                )
                              : comment.comment_text}
                            &rdquo;
                          </span>{" "}
                          {comment.author && (
                            <span className="text-blue-500 text-xs font-medium">
                              ({comment.author})
                            </span>
                          )}
                        </p>

                        {/* Sub-line: Article - Time */}
                        <p className="text-[11px] text-gray-400">
                          {comment.article_title &&
                          comment.article_title !== comment.article_url
                            ? comment.article_title
                            : domain}{" "}
                          -{" "}
                          {formatDate(comment.timestamp || comment.scanned_at)}
                        </p>

                        {/* Severity badge + link */}
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className={`text-[9px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${style.badge}`}
                          >
                            {getSeverityLabel(comment.severity)}
                          </span>
                          <a
                            href={comment.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors font-mono"
                          >
                            {domain}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SOURCES VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {currentView === "sources" && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Sources
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSourcesLoading(true);
                    fetchSources().finally(() => setSourcesLoading(false));
                  }}
                  className="p-1.5 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-all"
                  title="Refresh sources"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-gray-500 ${sourcesLoading ? "animate-spin" : ""}`}
                  />
                </button>
                {/* X/Y counter badge */}
                {sourcesStats.total > 0 && (
                  <span className="border border-gray-300 rounded px-3 py-1 text-sm font-bold text-gray-700 bg-white shadow-sm">
                    {sourcesStats.online}/{sourcesStats.total}
                  </span>
                )}
              </div>
            </div>

            {sourcesLoading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-red-400 animate-spin" />
                <p className="text-sm text-gray-400">
                  Checking source availability…
                </p>
                <p className="text-xs text-gray-300">
                  This may take a few seconds
                </p>
              </div>
            ) : sources.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <Globe className="w-10 h-10 text-gray-200" />
                <p className="text-sm text-gray-400">
                  No sources found. Run a scan to populate this list.
                </p>
              </div>
            ) : (
              <>
                {/* Column header */}
                <div className="px-8 py-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50/60">
                  <span>Domain</span>
                  <span>Status</span>
                </div>

                <ul className="divide-y divide-gray-100">
                  {sources.map((source) => (
                    <li
                      key={source.domain}
                      className="flex items-center justify-between px-8 py-4 hover:bg-gray-50/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors flex items-center gap-1"
                        >
                          {source.domain}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {source.status === "online" ? (
                          <>
                            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-600">
                              Online
                            </span>
                          </>
                        ) : source.status === "offline" ? (
                          <>
                            <WifiOff className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs font-semibold text-red-500">
                              Offline
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Unknown</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Footer summary */}
                <div className="px-8 py-3 bg-gray-50/60 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                  <span>
                    {sourcesStats.online} of {sourcesStats.total} sources
                    currently reachable
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Checked just now
                  </span>
                </div>
              </>
            )}
          </div>
        </main>
      )}

      {/* ── Scan Detail Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                <p className="text-sm font-medium text-gray-500">
                  Loading scan details...
                </p>
              </div>
            ) : modalData ? (
              <>
                <div className="border-b border-gray-150 px-6 py-4 bg-gray-50/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        Scan details for &ldquo;{modalData.session.keyword}&rdquo;
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">
                        {modalData.session.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Started: {formatDate(modalData.session.started_at)} •
                      Duration:{" "}
                      {getDuration(
                        modalData.session.started_at,
                        modalData.session.completed_at
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-lg transition-all text-xs font-semibold"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-gray-150 divide-x divide-gray-150 bg-white text-center">
                  {[
                    { label: "Articles", value: modalData.session.articles_found, cls: "text-gray-800" },
                    { label: "Comments", value: modalData.session.comments_scanned, cls: "text-gray-800" },
                    { label: "High threats", value: modalData.session.threats_high, cls: "text-red-600" },
                    { label: "Med threats", value: modalData.session.threats_medium, cls: "text-amber-600" },
                    { label: "Low threats", value: modalData.session.threats_low, cls: "text-blue-600" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="py-4">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        {label}
                      </p>
                      <p className={`text-lg font-bold mt-1 ${cls}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-64">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={modalSearchFilter}
                      onChange={(e) => setModalSearchFilter(e.target.value)}
                      placeholder="Search comments or author..."
                      className="w-full bg-white border border-gray-200 focus:border-red-300 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                    {["all", "safe", "low", "medium", "high"].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setModalSeverityFilter(sev)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                          modalSeverityFilter === sev
                            ? sev === "all"
                              ? "bg-gray-150 text-gray-700"
                              : sev === "safe"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : sev === "high"
                                  ? "bg-red-50 text-red-600 border border-red-200"
                                  : sev === "medium"
                                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                                    : "bg-blue-50 text-blue-600 border border-blue-200"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {sev === "all"
                          ? "All"
                          : sev === "safe"
                            ? "Safe"
                            : sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[300px]">
                  {filteredModalComments.length > 0 ? (
                    filteredModalComments.map((comment) => {
                      const style = getSeverityStyles(comment.severity);
                      return (
                        <div
                          key={comment.id}
                          className={`px-6 py-4 flex flex-col gap-2 transition-all border-l-4 hover:bg-gray-50/20 ${style.border}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded-full ${style.badge}`}
                              >
                                {getSeverityLabel(comment.severity)}
                              </span>
                              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />
                                {comment.author}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {formatDate(comment.scanned_at)}
                            </span>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-lg p-3 text-xs text-gray-700 leading-relaxed shadow-sm">
                            <p className="whitespace-pre-wrap">
                              {highlightText(
                                comment.comment_text,
                                comment.matched_patterns
                              )}
                            </p>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <a
                              href={comment.article_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-red-500 flex items-center gap-1 font-mono text-[9px]"
                            >
                              {comment.article_url
                                .replace(/https?:\/\/(www\.)?/, "")
                                .slice(0, 50)}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            {comment.matched_patterns &&
                              comment.severity !== "none" && (
                                <div className="flex gap-1">
                                  {comment.matched_patterns
                                    .split(",")
                                    .map((pat, i) => (
                                      <span
                                        key={i}
                                        className="text-[8px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100"
                                      >
                                        {pat.trim()}
                                      </span>
                                    ))}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <Database className="w-8 h-8 text-gray-200" />
                      <p className="text-xs text-gray-400">
                        No comments found matching the filters.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="text-xs text-gray-500">Failed to load scan data.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/60 text-center py-5 text-xs text-gray-400 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Aegis Security Suite. All rights reserved.</span>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Secure Local Sandbox Environment
          </span>
        </div>
      </footer>
    </div>
  );
}
