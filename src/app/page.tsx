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

export default function Home() {
  const {
    threats,
    allComments,
    articles,
    stats,
    scanSessions,
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
  } = useThreatStore();

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

  // Modal states
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<{
    session: ScanSession;
    comments: ScannedComment[];
    flagged: any[];
  } | null>(null);
  const [modalSeverityFilter, setModalSeverityFilter] = useState("all");
  const [modalSearchFilter, setModalSearchFilter] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchThreats();
    fetchAllComments();
    fetchStats();
    fetchArticles();
    fetchScanSessions();
    pollScanStatus();
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKeyword.trim() || isScanning) return;
    try {
      setActiveTab("all");
      const category = selectedCategory === "Custom" ? customCategory.trim() : selectedCategory;
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
    setSelectedScanId(id);
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

  const getDuration = (started: string, completed: string | null) => {
    if (!completed) return "Running...";
    try {
      const diffMs = new Date(completed).getTime() - new Date(started).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s`;
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      return `${mins}m ${secs}s`;
    } catch {
      return "—";
    }
  };

  // What to show depends on active tab
  const displayComments: ScannedComment[] = activeTab === "flagged"
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
      (selectedSeverity === "safe" ? c.severity === "none" : c.severity === selectedSeverity);
    const matchesSearch =
      filterSearch === "" ||
      c.comment_text.toLowerCase().includes(filterSearch.toLowerCase()) ||
      c.author.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (c.article_title || "").toLowerCase().includes(filterSearch.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const filteredModalComments = modalData?.comments.filter((c) => {
    const matchesSeverity =
      modalSeverityFilter === "all" ||
      (modalSeverityFilter === "safe" ? c.severity === "none" : c.severity === modalSeverityFilter);
    const matchesSearch =
      modalSearchFilter === "" ||
      c.comment_text.toLowerCase().includes(modalSearchFilter.toLowerCase()) ||
      c.author.toLowerCase().includes(modalSearchFilter.toLowerCase());
    return matchesSeverity && matchesSearch;
  }) || [];

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
      // Handle Unix timestamps from Reddit
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

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-900 grid-bg flex flex-col">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-red-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
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
                Executive & Organization Protection Suite
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
              onClick={() => { fetchThreats(); fetchAllComments(); fetchStats(); fetchArticles(); fetchScanSessions(); }}
              className="p-2 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-all"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isScanning ? "animate-spin text-red-500" : ""}`} />
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
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-6">

        {/* Top row: Search + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Search panel */}
          <div className={`col-span-1 lg:col-span-2 glass-panel rounded-2xl p-6 transition-all duration-300 ${isScanning ? "pulsing-rose-glow" : ""}`}>
            <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-red-500" />
              Initialize Threat Protection Scan
            </h2>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Enter a name, brand, or organization. Aegis queries Google News RSS &amp; Reddit and scans comment sections for threat signatures.
            </p>

            <form onSubmit={handleScanSubmit} className="flex flex-col md:flex-row gap-3 mb-4">
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
                    if (e.target.value !== "Custom") {
                      setCustomCategory("");
                    }
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
                  disabled={isScanning || !inputKeyword.trim() || (selectedCategory === "Custom" && !customCategory.trim())}
                  className="bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-5 py-2.5 font-medium text-sm transition-all flex items-center gap-2 shadow-sm hover:shadow-red-100 hover:shadow-md shrink-0"
                >
                  {isScanning ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Scanning...</>
                  ) : "Launch Scan"}
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
                  <span>📰 Articles: <strong className="text-gray-700">{articlesFound}</strong></span>
                  <span>💬 Comments: <strong className="text-gray-700">{commentsScanned}</strong></span>
                  <span>⚠ Threats: <strong className="text-red-600">{threatsFound}</strong></span>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-2">Quick Examples:</p>
              <div className="flex flex-wrap gap-2">
                {["Elon Musk", "Tim Cook", "Jeff Bezos", "Artificial Intelligence"].map((kw) => (
                  <button key={kw} onClick={() => handleQuickSearch(kw)} disabled={isScanning}
                    className="text-xs bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 disabled:opacity-40 text-gray-600 hover:text-gray-900 rounded-full px-3 py-1.5 transition-all shadow-sm">
                    + {kw}
                  </button>
                ))}
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
            <p className="text-xs text-gray-400 mb-4">Severity counts, flagged only</p>
            <div className="flex-1 min-h-[110px] flex items-center">
              {mounted && stats.total > 0 ? (
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={{ background: "#fff", borderColor: "#e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
              <span className="flex items-center gap-1"><Database className="w-3 h-3" /> SQLite</span>
              <span className="font-mono">threat_monitor.db</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total scanned */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Comments Scanned</p>
              <h3 className="text-2xl font-bold mt-0.5 text-gray-900">{stats.comments_scanned}</h3>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg"><MessageSquare className="w-5 h-5 text-gray-400" /></div>
          </div>

          {/* Flagged total */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Flagged</p>
              <h3 className="text-2xl font-bold mt-0.5 text-gray-900">{stats.total}</h3>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg"><Shield className="w-5 h-5 text-gray-400" /></div>
          </div>

          {[
            { sev: "high", label: "High Threats", value: stats.high, color: "red", Icon: ShieldAlert },
            { sev: "medium", label: "Med Threats", value: stats.medium, color: "amber", Icon: AlertTriangle },
            { sev: "low", label: "Low Threats", value: stats.low, color: "blue", Icon: Eye },
          ].map(({ sev, label, value, color, Icon }) => (
            <div key={sev}
              onClick={() => { setSelectedSeverity(selectedSeverity === sev ? "" : sev); setActiveTab("flagged"); }}
              className={`border rounded-xl p-4 shadow-sm flex items-center justify-between transition-all duration-150 cursor-pointer ${
                selectedSeverity === sev
                  ? `bg-${color}-50 border-${color}-300 shadow-${color}-100 shadow-md`
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow"
              }`}
            >
              <div>
                <p className={`text-xs font-medium flex items-center gap-1 ${selectedSeverity === sev ? `text-${color}-600` : "text-gray-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-${color}-500`} />
                  {label}
                </p>
                <h3 className={`text-2xl font-bold mt-0.5 ${
                  color === "red" ? "text-red-600" : color === "amber" ? "text-amber-600" : "text-blue-600"
                }`}>{value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${selectedSeverity === sev ? `bg-${color}-100` : "bg-gray-50"}`}>
                <Icon className={`w-5 h-5 ${selectedSeverity === sev
                  ? color === "red" ? "text-red-600" : color === "amber" ? "text-amber-600" : "text-blue-600"
                  : "text-gray-400"}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Scan History collapsible */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50/60 transition-all">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Scan History &amp; Sessions ({scanSessions.length})
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
                      const totalThreats = session.threats_high + session.threats_medium + session.threats_low;
                      return (
                        <tr key={session.id} className="hover:bg-gray-50/60 transition-colors align-middle">
                          <td className="px-6 py-4 font-semibold text-gray-800">{session.keyword}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-600">
                              {session.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(session.started_at)}</td>
                          <td className="px-6 py-4 text-center font-medium text-gray-700">{session.articles_found}</td>
                          <td className="px-6 py-4 text-center font-medium text-gray-700">{session.comments_scanned}</td>
                          <td className="px-6 py-4 text-center">
                            {totalThreats > 0 ? (
                              <div className="flex justify-center items-center gap-1">
                                {session.threats_high > 0 && (
                                  <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-200" title="High threats">
                                    {session.threats_high}H
                                  </span>
                                )}
                                {session.threats_medium > 0 && (
                                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200" title="Medium threats">
                                    {session.threats_medium}M
                                  </span>
                                )}
                                {session.threats_low > 0 && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-200" title="Low threats">
                                    {session.threats_low}L
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-medium">None</span>
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
                              <span className="inline-flex items-center gap-1 text-red-600 font-medium" title={session.error_message || "Error occurred"}>
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
            <button onClick={() => setShowArticles(!showArticles)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50/60 transition-all">
              <span className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-gray-500" />
                Articles Scanned ({articles.length})
              </span>
              {showArticles ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showArticles && (
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {articles.map((article, i) => (
                  <div key={i} className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-gray-50/60 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{article.title}</p>
                      <p className="text-gray-400 font-mono text-[10px] truncate mt-0.5">{article.url}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-400">{formatDate(article.scraped_at)}</span>
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments panel with tabs */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          {/* Tab + Filter header */}
          <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Tabs */}
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

            {/* Search + severity filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-56">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Filter by author, text, article..."
                  className="w-full bg-white border border-gray-200 focus:border-red-300 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none transition-all placeholder:text-gray-400" />
              </div>

              <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                {(activeTab === "all"
                  ? ["", "safe", "low", "medium", "high"]
                  : ["", "low", "medium", "high"]
                ).map((sev) => (
                  <button key={sev} onClick={() => setSelectedSeverity(sev)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      selectedSeverity === sev
                        ? sev === "" ? "bg-gray-100 text-gray-700"
                          : sev === "safe" ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : sev === "high" ? "bg-red-50 text-red-600 border border-red-200"
                          : sev === "medium" ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                        : "text-gray-400 hover:text-gray-600"
                    }`}>
                    {sev === "" ? "All" : sev === "safe" ? "Safe" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comment list */}
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredComments.length > 0 ? (
              filteredComments.map((comment) => {
                const isExpanded = expandedComment === comment.id;
                const style = getSeverityStyles(comment.severity);

                return (
                  <div key={comment.id}
                    className={`px-6 py-5 flex flex-col gap-3 transition-all border-l-4 hover:bg-gray-50/40 ${style.border}`}>
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${style.badge}`}>
                          {getSeverityLabel(comment.severity)}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-800">{comment.author}</span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDate(comment.scanned_at)}
                      </span>
                    </div>

                    {/* Article title */}
                    {comment.article_title && comment.article_title !== comment.article_url && (
                      <p className="text-[11px] text-gray-400 font-medium truncate">
                        📰 {comment.article_title}
                      </p>
                    )}

                    {/* Comment text */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed shadow-sm">
                      <p className={`${isExpanded ? "" : "line-clamp-3"} whitespace-pre-wrap`}>
                        {comment.comment_text}
                      </p>
                      {comment.comment_text.length > 200 && (
                        <button onClick={() => setExpandedComment(isExpanded ? null : comment.id)}
                          className="text-[10px] font-semibold text-red-500 hover:text-red-600 mt-2 block transition-all">
                          {isExpanded ? "Show less ↑" : "Show full comment ↓"}
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-gray-400 shrink-0">Source:</span>
                        <a href={comment.article_url} target="_blank" rel="noopener noreferrer"
                          className="text-gray-500 hover:text-red-500 flex items-center gap-1 truncate max-w-xs font-mono text-[10px] transition-colors">
                          {comment.article_url.replace(/https?:\/\/(www\.)?/, "").slice(0, 60)}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      {comment.matched_patterns && comment.severity !== "none" && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-400 shrink-0 font-medium">Matched:</span>
                          {comment.matched_patterns.split(",").map((pat, i) => (
                            <span key={i} className="text-[9px] font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
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
                  {activeTab === "flagged" ? "No Flagged Threats Found" : "No Comments Yet"}
                </h4>
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                  {filterSearch || selectedSeverity
                    ? "Try adjusting your filter or search term."
                    : activeTab === "flagged"
                    ? "No threats were detected. Switch to 'All Comments' to see what was scanned."
                    : "Run a scan above. All scraped comments will appear here regardless of threat level."}
                </p>
                {activeTab === "flagged" && allComments.length > 0 && (
                  <button onClick={() => setActiveTab("all")}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2">
                    View {allComments.length} scanned comments →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Scan Detail Modal Overlay */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          {/* Modal Container */}
          <div 
            className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                <p className="text-sm font-medium text-gray-500">Loading scan details...</p>
              </div>
            ) : modalData ? (
              <>
                {/* Modal Header */}
                <div className="border-b border-gray-150 px-6 py-4 bg-gray-50/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        Scan details for "{modalData.session.keyword}"
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">
                        {modalData.session.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Started: {formatDate(modalData.session.started_at)} • Duration: {getDuration(modalData.session.started_at, modalData.session.completed_at)}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-250 text-gray-500 hover:text-gray-700 rounded-lg transition-all text-xs font-semibold"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Modal Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-gray-150 divide-x divide-gray-150 bg-white text-center">
                  <div className="py-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Articles</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">{modalData.session.articles_found}</p>
                  </div>
                  <div className="py-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Comments</p>
                    <p className="text-lg font-bold text-gray-800 mt-1">{modalData.session.comments_scanned}</p>
                  </div>
                  <div className="py-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider text-red-500">High threats</p>
                    <p className="text-lg font-bold text-red-600 mt-1">{modalData.session.threats_high}</p>
                  </div>
                  <div className="py-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider text-amber-500">Med threats</p>
                    <p className="text-lg font-bold text-amber-600 mt-1">{modalData.session.threats_medium}</p>
                  </div>
                  <div className="py-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider text-blue-500">Low threats</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">{modalData.session.threats_low}</p>
                  </div>
                </div>

                {/* Filters block inside modal */}
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
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          modalSeverityFilter === sev
                            ? sev === "all" ? "bg-gray-150 text-gray-700"
                              : sev === "safe" ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : sev === "high" ? "bg-red-50 text-red-600 border border-red-200"
                              : sev === "medium" ? "bg-amber-50 text-amber-600 border border-amber-200"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {sev === "all" ? "All" : sev === "safe" ? "Safe" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments List inside Modal */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-[300px]">
                  {filteredModalComments.length > 0 ? (
                    filteredModalComments.map((comment) => {
                      const style = getSeverityStyles(comment.severity);
                      return (
                        <div key={comment.id} className={`px-6 py-4 flex flex-col gap-2 transition-all border-l-4 hover:bg-gray-50/20 ${style.border}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded-full ${style.badge}`}>
                                {getSeverityLabel(comment.severity)}
                              </span>
                              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />
                                {comment.author}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">{formatDate(comment.scanned_at)}</span>
                          </div>

                          <div className="bg-white border border-gray-100 rounded-lg p-3 text-xs text-gray-700 leading-relaxed shadow-sm">
                            <p className="whitespace-pre-wrap">{comment.comment_text}</p>
                          </div>

                          <div className="flex justify-between items-center text-[11px]">
                            <a href={comment.article_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 flex items-center gap-1 font-mono text-[9px]">
                              {comment.article_url.replace(/https?:\/\/(www\.)?/, "").slice(0, 50)}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            {comment.matched_patterns && comment.severity !== "none" && (
                              <div className="flex gap-1">
                                {comment.matched_patterns.split(",").map((pat, i) => (
                                  <span key={i} className="text-[8px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
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
                      <p className="text-xs text-gray-400">No comments found matching the filters.</p>
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
