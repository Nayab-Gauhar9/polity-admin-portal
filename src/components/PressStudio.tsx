import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Save,
  Newspaper,
  AlertCircle,
  CheckCircle2,
  Search,
  Plus,
  Trash2,
  Code2,
  Copy,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Scale,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';

interface QueueItem {
  object_key: string;
  filename: string;
  article_id: string;
  headline: string;
  title: string;
  publication: string;
  category: string;
  chapter_name: string;
  article_date: string;
  url: string;
}

interface DialecticalDimension {
  dimension: string;
  argument: string;
  substantiation: string;
}

interface PrelimsTrap {
  statement: string;
  is_correct: boolean;
  trap_mechanism: string;
  explanation: string;
}

export default function PressStudio() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPub, setSelectedPub] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Raw JSON Modal State
  const [showRawModal, setShowRawModal] = useState<boolean>(false);
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);

  // Active Note State
  const [note, setNote] = useState<any>(null);

  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'https://newspaper-upsc-ai.onrender.com').replace(/\/$/, '');

  // 1. Fetch Queue List from /api/v1/daily-press/admin/queue
  const { data: queueData, isLoading: isQueueLoading, refetch: refetchQueue } = useQuery<{ items: QueueItem[]; total: number }>({
    queryKey: ['adminDailyPressQueue'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/v1/daily-press/admin/queue?limit=500`);
      return res.data;
    },
  });

  const rawQueue = queueData?.items || [];

  // Extract distinct available dates sorted descending
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(rawQueue.map((i) => i.article_date).filter(Boolean)));
    return dates.sort((a, b) => b.localeCompare(a));
  }, [rawQueue]);

  // Source Counts for Selected Date
  const sourceStats = useMemo(() => {
    const filteredByDate = selectedDate === 'ALL' 
      ? rawQueue 
      : rawQueue.filter((i) => i.article_date === selectedDate);

    const hinduCount = filteredByDate.filter((i) => i.publication.toLowerCase() === 'the_hindu').length;
    const expressCount = filteredByDate.filter((i) => i.publication.toLowerCase() === 'indian_express').length;

    return {
      all: filteredByDate.length,
      hindu: hinduCount,
      express: expressCount,
    };
  }, [rawQueue, selectedDate]);

  // Multi-Filter Queue
  const filteredQueue = useMemo(() => {
    let list = [...rawQueue];

    if (selectedDate !== 'ALL') {
      list = list.filter((i) => i.article_date === selectedDate);
    }

    if (selectedPub !== 'ALL') {
      list = list.filter((i) => i.publication.toLowerCase() === selectedPub.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          (i.headline && i.headline.toLowerCase().includes(q)) ||
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.chapter_name && i.chapter_name.toLowerCase().includes(q)) ||
          (i.article_id && i.article_id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rawQueue, selectedDate, selectedPub, searchQuery]);

  // Auto-select first item if current selection isn't in filtered list
  useEffect(() => {
    if (filteredQueue.length > 0) {
      const exists = filteredQueue.some((i) => i.object_key === selectedKey);
      if (!exists) {
        loadDetail(filteredQueue[0].object_key);
      }
    } else {
      setSelectedKey('');
      setNote(null);
    }
  }, [filteredQueue]);

  // 2. Fetch Detail from /api/v1/daily-press/admin/detail
  const loadDetail = async (key: string) => {
    setSelectedKey(key);
    setStatusMessage(null);
    try {
      const res = await axios.get(`${apiBase}/api/v1/daily-press/admin/detail?object_key=${encodeURIComponent(key)}`);
      setNote(res.data.data || {});
    } catch (err: any) {
      setStatusMessage({ text: 'Failed to retrieve note detail from storage.', type: 'error' });
    }
  };

  // 3. Save Mutation to /api/v1/daily-press/admin/save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKey || !note) return;
      const res = await axios.put(`${apiBase}/api/v1/daily-press/admin/save`, {
        object_key: selectedKey,
        ...note,
      });
      return res.data;
    },
    onSuccess: () => {
      setStatusMessage({ text: 'Successfully persisted to storage and flushed Redis cache!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['adminDailyPressQueue'] });
      setTimeout(() => setStatusMessage(null), 4000);
    },
    onError: (err: any) => {
      setStatusMessage({ text: `Save Failed: ${err.response?.data?.detail || err.message}`, type: 'error' });
    },
  });

  // Hotkey: Ctrl+S or Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedKey && !saveMutation.isPending) {
          saveMutation.mutate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKey, saveMutation]);

  // Raw JSON Modal Handlers
  const handleOpenRaw = () => {
    setRawJsonText(JSON.stringify(note, null, 2));
    setParseError(null);
    setShowRawModal(true);
  };

  const handleApplyRaw = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setNote(parsed);
      setShowRawModal(false);
      setStatusMessage({ text: 'JSON applied to editor fields! Press Save to persist.', type: 'success' });
    } catch (err: any) {
      setParseError(`JSON Syntax Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Newspaper className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100">Daily Press Review Studio</h1>
              <span className="bg-sky-950/60 text-sky-400 border border-sky-800/60 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                NewspaperStorage Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Audit, refine, and verify 6-layer PhD notes. Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded font-mono text-slate-300">Ctrl+S</kbd> to persist.
            </p>
          </div>
        </div>

        {selectedKey && note && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenRaw}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition"
            >
              <Code2 className="h-3.5 w-3.5" />
              Raw JSON
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Persisting...' : 'Save & Flush Cache'}
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border shadow-lg ${
          statusMessage.type === 'error' ? 'bg-rose-950/50 border-rose-800 text-rose-300' : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'error' ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-slate-300">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Dual-Pane Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Multi-Filter Queue Drawer */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Notes Queue ({filteredQueue.length})
              </h2>
            </div>
            <button
              onClick={() => refetchQueue()}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Date Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Select Target Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Available Dates ({rawQueue.length} notes)</option>
              {availableDates.map((d) => {
                const count = rawQueue.filter((i) => i.article_date === d).length;
                return (
                  <option key={d} value={d}>
                    {d} ({count} notes)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Source Filter Tabs */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Source Selection {selectedDate !== 'ALL' && `(${selectedDate})`}
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/80 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedPub('ALL')}
                className={`py-1 rounded font-medium transition text-center ${
                  selectedPub === 'ALL'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({sourceStats.all})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPub('the_hindu')}
                className={`py-1 rounded font-medium transition text-center ${
                  selectedPub === 'the_hindu'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hindu ({sourceStats.hindu})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPub('indian_express')}
                className={`py-1 rounded font-medium transition text-center ${
                  selectedPub === 'indian_express'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Express ({sourceStats.express})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by headline, chapter, ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Scrollable Item List */}
          <div className="space-y-2 max-h-[calc(100vh-330px)] overflow-y-auto pr-1">
            {isQueueLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Scanning notes queue...</div>
            ) : filteredQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No records found.</div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedKey === item.object_key;
                return (
                  <div
                    key={item.object_key}
                    onClick={() => loadDetail(item.object_key)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-1.5 py-0.5 rounded font-bold uppercase">
                        {item.publication.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.article_date}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug">
                      {item.headline || item.title}
                    </p>
                    <div className="text-[10px] text-slate-500 truncate">{item.chapter_name}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: 6-Layer Editorial Workspace */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
          {note ? (
            <div className="space-y-6">
              {/* Header Metadata */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 font-bold">{note.article_id}</span>
                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      Original Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                  {note.article_date}
                </span>
              </div>

              {/* 1. Academic Headline & Laxmikanth Chapter Mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Academic Structural Headline</label>
                  <input
                    type="text"
                    value={note.headline || ''}
                    onChange={(e) => setNote({ ...note, headline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Laxmikanth Chapter Mapping</label>
                  <input
                    type="text"
                    value={note.chapter_name || ''}
                    onChange={(e) => setNote({ ...note, chapter_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 2. Issue Framing */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Issue Framing (~80 Words Constitutional Overview)
                </label>
                <textarea
                  rows={3}
                  value={note.issue_framing || ''}
                  onChange={(e) => setNote({ ...note, issue_framing: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 3. Static Backward Linkages */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> Static Backward Linkages
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Articles & Schedules</label>
                    <textarea
                      rows={2}
                      value={(note.backward_linkages?.articles_and_schedules || []).join('\n')}
                      onChange={(e) =>
                        setNote({
                          ...note,
                          backward_linkages: {
                            ...note.backward_linkages,
                            articles_and_schedules: e.target.value.split('\n'),
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sky-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Landmark Judgments</label>
                    <textarea
                      rows={2}
                      value={(note.backward_linkages?.landmark_judgments || []).join('\n')}
                      onChange={(e) =>
                        setNote({
                          ...note,
                          backward_linkages: {
                            ...note.backward_linkages,
                            landmark_judgments: e.target.value.split('\n'),
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-amber-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Committees & Commissions</label>
                    <textarea
                      rows={2}
                      value={(note.backward_linkages?.commissions_and_committees || []).join('\n')}
                      onChange={(e) =>
                        setNote({
                          ...note,
                          backward_linkages: {
                            ...note.backward_linkages,
                            commissions_and_committees: e.target.value.split('\n'),
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-emerald-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Constitutional Doctrines</label>
                    <textarea
                      rows={2}
                      value={(note.backward_linkages?.constitutional_doctrines || []).join('\n')}
                      onChange={(e) =>
                        setNote({
                          ...note,
                          backward_linkages: {
                            ...note.backward_linkages,
                            constitutional_doctrines: e.target.value.split('\n'),
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-purple-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Dialectical Framework (Thesis vs Antithesis) */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Thesis Affirmative */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Thesis (Affirmative Rationales)
                    </label>
                    {(note.thesis_affirmative || []).map((t: DialecticalDimension, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                        <input
                          type="text"
                          value={t.dimension}
                          placeholder="Dimension name..."
                          onChange={(e) => {
                            const updated = [...note.thesis_affirmative];
                            updated[idx].dimension = e.target.value;
                            setNote({ ...note, thesis_affirmative: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-semibold focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={t.argument}
                          placeholder="Scholarly argument..."
                          onChange={(e) => {
                            const updated = [...note.thesis_affirmative];
                            updated[idx].argument = e.target.value;
                            setNote({ ...note, thesis_affirmative: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={t.substantiation}
                          placeholder="Substantiation..."
                          onChange={(e) => {
                            const updated = [...note.thesis_affirmative];
                            updated[idx].substantiation = e.target.value;
                            setNote({ ...note, thesis_affirmative: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400 text-[11px] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Antithesis Critique */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                      Antithesis (Constitutional Vulnerabilities)
                    </label>
                    {(note.antithesis_critique || []).map((t: DialecticalDimension, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                        <input
                          type="text"
                          value={t.dimension}
                          placeholder="Dimension name..."
                          onChange={(e) => {
                            const updated = [...note.antithesis_critique];
                            updated[idx].dimension = e.target.value;
                            setNote({ ...note, antithesis_critique: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-rose-400 font-semibold focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={t.argument}
                          placeholder="Critique argument..."
                          onChange={(e) => {
                            const updated = [...note.antithesis_critique];
                            updated[idx].argument = e.target.value;
                            setNote({ ...note, antithesis_critique: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={t.substantiation}
                          placeholder="Substantiation..."
                          onChange={(e) => {
                            const updated = [...note.antithesis_critique];
                            updated[idx].substantiation = e.target.value;
                            setNote({ ...note, antithesis_critique: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-400 text-[11px] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Edge Case & Paradox */}
              <div className="pt-3 border-t border-slate-800">
                <label className="text-xs font-bold text-amber-400 block mb-1">
                  Edge Case & Unintended Institutional Consequences
                </label>
                <textarea
                  rows={2}
                  value={note.edge_case_and_unintended_consequences || ''}
                  onChange={(e) =>
                    setNote({ ...note, edge_case_and_unintended_consequences: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 6. Prelims Traps Drill */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Prelims Edge Traps ({(note.prelims_edge_traps || []).length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNote({
                        ...note,
                        prelims_edge_traps: [
                          ...(note.prelims_edge_traps || []),
                          { statement: '', is_correct: false, trap_mechanism: 'Constitutional vs Statutory', explanation: '' },
                        ],
                      })
                    }
                    className="text-[11px] text-sky-400 hover:text-white flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Trap
                  </button>
                </div>

                <div className="space-y-3">
                  {(note.prelims_edge_traps || []).map((trap: PrelimsTrap, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-400 font-bold">TRAP #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...note.prelims_edge_traps];
                              updated[idx].is_correct = !updated[idx].is_correct;
                              setNote({ ...note, prelims_edge_traps: updated });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                              trap.is_correct
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                                : 'bg-rose-950/60 text-rose-400 border-rose-500/50'
                            }`}
                          >
                            {trap.is_correct ? 'STATEMENT IS TRUE' : 'STATEMENT IS FALSE (TRAP)'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...note.prelims_edge_traps];
                            updated.splice(idx, 1);
                            setNote({ ...note, prelims_edge_traps: updated });
                          }}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={trap.statement}
                        placeholder="Examiner Statement..."
                        onChange={(e) => {
                          const updated = [...note.prelims_edge_traps];
                          updated[idx].statement = e.target.value;
                          setNote({ ...note, prelims_edge_traps: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-medium focus:outline-none"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={trap.trap_mechanism}
                          placeholder="Trap Mechanism..."
                          onChange={(e) => {
                            const updated = [...note.prelims_edge_traps];
                            updated[idx].trap_mechanism = e.target.value;
                            setNote({ ...note, prelims_edge_traps: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 text-[11px] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={trap.explanation}
                          placeholder="Legal explanation / statutory section..."
                          onChange={(e) => {
                            const updated = [...note.prelims_edge_traps];
                            updated[idx].explanation = e.target.value;
                            setNote({ ...note, prelims_edge_traps: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Mains Framework & Blindspot */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  Mains GS-II Blueprint & Examiner Blindspot
                </label>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Mains Probable Question (15M, 250W)</label>
                  <input
                    type="text"
                    value={note.mains_framework?.mains_probable_question || ''}
                    onChange={(e) =>
                      setNote({
                        ...note,
                        mains_framework: {
                          ...note.mains_framework,
                          mains_probable_question: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Aspirant Blindspot vs Expert Differentiation</label>
                  <textarea
                    rows={2}
                    value={note.aspirant_blindspot || ''}
                    onChange={(e) => setNote({ ...note, aspirant_blindspot: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-amber-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Commit Button */}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 rounded-xl text-xs font-bold text-white transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Persisting changes...' : 'Save & Flush Cache'}
              </button>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Newspaper className="h-8 w-8 text-slate-700" />
              <span>Select an article from the left queue to review and edit its analysis.</span>
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON Modal & Injector */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-200">Raw JSON Editor & Injector</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(rawJsonText);
                    setCopiedRaw(true);
                    setTimeout(() => setCopiedRaw(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  {copiedRaw ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedRaw ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => setShowRawModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {parseError && (
              <div className="px-4 py-2 bg-rose-950/60 border-b border-rose-800 text-rose-300 text-[11px]">
                {parseError}
              </div>
            )}

            <div className="relative flex-1 p-3 bg-slate-950 flex flex-col min-h-[480px]">
              <textarea
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  if (parseError) setParseError(null);
                }}
                spellCheck={false}
                className="w-full h-full flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-sky-200 focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRawModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRaw}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                <Check className="h-3.5 w-3.5" /> Apply to Studio Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}