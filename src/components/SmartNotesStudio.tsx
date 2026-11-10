import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Save,
  Layers,
  AlertCircle,
  FileText,
  CheckCircle2,
  Database,
  Search,
  Plus,
  Trash2,
  ArrowUpDown,
  Filter,
  Sparkles,
  Check,
  X,
  Code2,
  Copy,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

const coreApi = axios.create({
  baseURL: import.meta.env.VITE_CORE_API_URL || import.meta.env.VITE_API_BASE_URL,
});

coreApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('PM_ADMIN_SECRET');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface QueueItem {
  object_key: string;
  chapter: string;
  topic: string;
  prid: string;
  prid_num?: number;
  headline: string;
  size_kb?: number;
  last_modified?: string;
}

interface PrelimsPoint {
  statement: string;
  rule: string;
  explanation: string;
  trap: string;
  is_correct: boolean;
}

interface BackwardLinkage {
  title: string;
  anchor: string;
  description: string;
}

export default function SmartNotesStudio() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [sortByRecent, setSortByRecent] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Raw JSON Modal & Injection States
  const [showRawJsonModal, setShowRawJsonModal] = useState<boolean>(false);
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);

  // Form State
  const [headline, setHeadline] = useState('');
  const [subHeadline, setSubHeadline] = useState('');
  const [pibContext, setPibContext] = useState('');
  const [strategicValue, setStrategicValue] = useState('');
  const [smartNotes, setSmartNotes] = useState<string[]>([]);
  const [mainsQuestion, setMainsQuestion] = useState('');
  const [backwardLinkages, setBackwardLinkages] = useState<BackwardLinkage[]>([]);
  const [prelimsPoints, setPrelimsPoints] = useState<PrelimsPoint[]>([]);

  // 1. Fetch R2 Queue
  const { data: queueResponse, isLoading, refetch: refetchQueue } = useQuery<{ items: QueueItem[]; chapters: string[] }>({
    queryKey: ['r2SmartNotesQueue'],
    queryFn: async () => {
      const res = await coreApi.get('/api/admin/smart-notes/queue?limit=300');
      return {
        items: res.data.items || [],
        chapters: res.data.chapters || [],
      };
    },
  });

  const rawQueue = queueResponse?.items || [];
  const chaptersList = queueResponse?.chapters || [];

  // Filter & Sort Pipeline
  const filteredQueue = useMemo(() => {
    let list = [...rawQueue];

    if (selectedChapter !== 'ALL') {
      list = list.filter((item) => item.chapter === selectedChapter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.headline.toLowerCase().includes(q) ||
          item.chapter.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q) ||
          item.prid.includes(q)
      );
    }

    if (sortByRecent) {
      list.sort((a, b) => (b.prid_num || parseInt(b.prid, 10) || 0) - (a.prid_num || parseInt(a.prid, 10) || 0));
    }

    return list;
  }, [rawQueue, selectedChapter, searchQuery, sortByRecent]);

  // Auto-select first item when loaded
  useEffect(() => {
    if (filteredQueue.length > 0 && !selectedKey) {
      loadDetail(filteredQueue[0].object_key);
    }
  }, [filteredQueue, selectedKey]);

  // 2. Fetch specific Note Detail
  const loadDetail = async (key: string) => {
    setSelectedKey(key);
    setStatusMessage(null);
    try {
      const res = await coreApi.get(`/api/admin/smart-notes/detail?object_key=${encodeURIComponent(key)}`);
      const raw = res.data.data || {};

      setHeadline(raw.headline || raw.title || '');
      setSubHeadline(raw.sub_headline || '');
      setPibContext(raw.pib_executive_context || raw.summary || '');
      setStrategicValue(raw.strategic_upsc_value || raw.why_it_matters || '');
      setMainsQuestion(raw.mains_analytical_question || raw.mains_question || '');

      // Normalize smart_notes
      const rawNotes = raw.smart_notes || [];
      setSmartNotes(
        rawNotes.map((item: any) =>
          typeof item === 'string'
            ? item
            : (item.title ? `${item.title}: ${item.body || item.desc || ''}` : JSON.stringify(item))
        )
      );

      // Normalize backward linkages
      const links = raw.backward_linkages || [];
      setBackwardLinkages(
        links.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            const t = item.title || item.anchor || '';
            return {
              title: t,
              anchor: t,
              description: item.description || item.desc || '',
            };
          }
          return { title: String(item), anchor: String(item), description: '' };
        })
      );

      // Normalize prelims traps/drills with explicit is_correct boolean
      const prelims = raw.prelims_practice_points || [];
      setPrelimsPoints(
        prelims.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            const stmt = item.statement || item.rule || '';
            const expl = item.explanation || item.trap || '';
            let isCorrect = item.is_correct;
            if (isCorrect === undefined || isCorrect === null) {
              isCorrect = item.trap ? false : true;
            }
            return {
              statement: stmt,
              rule: stmt,
              explanation: expl,
              trap: expl,
              is_correct: Boolean(isCorrect),
            };
          }
          return {
            statement: String(item),
            rule: String(item),
            explanation: '',
            trap: '',
            is_correct: true,
          };
        })
      );
    } catch (err) {
      console.error('Failed to load R2 note detail', err);
      setStatusMessage({ text: 'Failed to retrieve note detail from R2 storage.', type: 'error' });
    }
  };

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        object_key: selectedKey,
        headline,
        title: headline,
        sub_headline: subHeadline,
        pib_executive_context: pibContext,
        summary: pibContext,
        strategic_upsc_value: strategicValue,
        why_it_matters: strategicValue,
        smart_notes: smartNotes.filter((n) => n.trim().length > 0),
        backward_linkages: backwardLinkages.map((b) => ({
          title: b.title.trim(),
          anchor: b.title.trim(),
          description: b.description.trim(),
        })),
        prelims_practice_points: prelimsPoints.map((p) => ({
          statement: p.statement.trim(),
          rule: p.statement.trim(),
          explanation: p.explanation.trim(),
          trap: p.explanation.trim(),
          is_correct: p.is_correct,
        })),
        mains_analytical_question: mainsQuestion,
        mains_question: mainsQuestion,
        re_render_slides: false,
      };
      const res = await coreApi.put('/api/admin/smart-notes/save', payload);
      return res.data;
    },
    onSuccess: () => {
      setStatusMessage({ text: 'Persisted to R2 & invalidated Redis caches (v5 + latest)!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['r2SmartNotesQueue'] });
      setTimeout(() => setStatusMessage(null), 5000);
    },
    onError: (err: any) => {
      setStatusMessage({ text: `Save Failed: ${err.response?.data?.detail || err.message}`, type: 'error' });
    },
  });

  // Global Keyboard Shortcut: Ctrl+S / Cmd+S to Save
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

  // Compiled raw preview object
  const compiledRawPayload = useMemo(() => {
    return {
      headline,
      sub_headline: subHeadline,
      summary: pibContext,
      why_it_matters: strategicValue,
      smart_notes: smartNotes,
      backward_linkages: backwardLinkages,
      prelims_practice_points: prelimsPoints,
      mains_question: mainsQuestion,
      object_key: selectedKey,
    };
  }, [headline, subHeadline, pibContext, strategicValue, smartNotes, backwardLinkages, prelimsPoints, mainsQuestion, selectedKey]);

  // Open Raw JSON Editor Modal
  const handleOpenRawEditor = () => {
    setRawJsonText(JSON.stringify(compiledRawPayload, null, 2));
    setJsonParseError(null);
    setShowRawJsonModal(true);
  };

  // Parse Pasted JSON and Hydrate Studio Fields
  const handleApplyPastedJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setJsonParseError(null);

      // Apply scalar & text fields
      if (parsed.headline || parsed.title) setHeadline(parsed.headline || parsed.title);
      if (parsed.sub_headline !== undefined) setSubHeadline(parsed.sub_headline || '');
      if (parsed.summary || parsed.pib_executive_context) {
        setPibContext(parsed.summary || parsed.pib_executive_context);
      }
      if (parsed.why_it_matters || parsed.strategic_upsc_value) {
        setStrategicValue(parsed.why_it_matters || parsed.strategic_upsc_value);
      }
      if (parsed.mains_question || parsed.mains_analytical_question) {
        setMainsQuestion(parsed.mains_question || parsed.mains_analytical_question);
      }

      // Apply smart notes array
      if (Array.isArray(parsed.smart_notes)) {
        setSmartNotes(parsed.smart_notes.map((s: any) => String(s)));
      }

      // Apply backward linkages
      if (Array.isArray(parsed.backward_linkages)) {
        setBackwardLinkages(
          parsed.backward_linkages.map((item: any) => ({
            title: item.title || item.anchor || '',
            anchor: item.title || item.anchor || '',
            description: item.description || item.desc || '',
          }))
        );
      }

      // Apply prelims practice points with explicit is_correct boolean handling
      if (Array.isArray(parsed.prelims_practice_points)) {
        setPrelimsPoints(
          parsed.prelims_practice_points.map((item: any) => {
            const stmt = item.statement || item.rule || '';
            const expl = item.explanation || item.trap || '';
            let isCorr = item.is_correct;
            if (isCorr === undefined || isCorr === null) {
              isCorr = !item.trap;
            }
            return {
              statement: stmt,
              rule: stmt,
              explanation: expl,
              trap: expl,
              is_correct: Boolean(isCorr),
            };
          })
        );
      }

      setShowRawJsonModal(false);
      setStatusMessage({
        text: 'Pasted JSON parsed and applied to studio fields! Review or press Save to commit to R2.',
        type: 'success',
      });
    } catch (err: any) {
      setJsonParseError(`Invalid JSON Syntax: ${err.message}`);
    }
  };

  const copyRawJson = () => {
    navigator.clipboard.writeText(rawJsonText || JSON.stringify(compiledRawPayload, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* Top Header Cockpit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Database className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">R2 Smart Notes Studio</h1>
              <span className="bg-sky-950/60 text-sky-400 border border-sky-800/60 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                Direct Cloudflare R2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Edit live current affairs capsules, constitutional anchors, and prelims traps. Press{' '}
              <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded font-mono text-slate-300">Ctrl+S</kbd> to save.
            </p>
          </div>
        </div>

        {selectedKey && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenRawEditor}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition"
              title="Edit or Paste Raw JSON"
            >
              <Code2 className="h-3.5 w-3.5" />
              Raw JSON Editor
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Syncing to R2...' : 'Save & Invalidate Cache'}
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border shadow-lg ${
            statusMessage.type === 'error'
              ? 'bg-rose-950/50 border-rose-800 text-rose-300'
              : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'error' ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-slate-300">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Dual Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Note Navigation Drawer (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                PIB Releases ({filteredQueue.length})
              </h2>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => refetchQueue()}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                title="Refresh Queue"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSortByRecent(!sortByRecent)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition ${
                  sortByRecent
                    ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <ArrowUpDown className="h-2.5 w-2.5" />
                {sortByRecent ? 'Recent PRID' : 'Default'}
              </button>
            </div>
          </div>

          {/* Chapter Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-2.5 w-2.5 text-sky-400" /> Canonical Chapter:
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setSelectedKey('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 truncate"
            >
              <option value="ALL">All Subjects ({rawQueue.length} notes)</option>
              {chaptersList.map((chap) => {
                const count = rawQueue.filter((x) => x.chapter === chap).length;
                return (
                  <option key={chap} value={chap}>
                    {chap} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by headline, topic, or PRID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Queue List Scrollable Container */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                <span>Scanning R2 bucket catalog...</span>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No records matching the filter.</div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedKey === item.object_key;
                return (
                  <div
                    key={item.object_key}
                    onClick={() => loadDetail(item.object_key)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded font-bold">
                        PRID #{item.prid}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px] font-medium">
                        {item.chapter}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug">{item.headline}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span className="truncate max-w-[180px]">{item.topic}</span>
                      {item.size_kb && <span>{item.size_kb} KB</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Editor Cockpit (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
          {selectedKey ? (
            <div className="space-y-6">
              {/* Note Key Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-mono text-slate-400 truncate">
                    {selectedKey}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                  Slide Sync Ready
                </span>
              </div>

              {/* 1. Headline & Subheadline */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Sub-Headline / Context Tag</label>
                  <input
                    type="text"
                    value={subHeadline}
                    onChange={(e) => setSubHeadline(e.target.value)}
                    placeholder="e.g. Cooperative Federalism • ICAR Institutional Machinery"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-sky-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 2. Executive Context / Summary */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Executive Context / 3-Sentence Synthesis
                </label>
                <textarea
                  rows={3}
                  value={pibContext}
                  onChange={(e) => setPibContext(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 3. Strategic UPSC Value */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  GS-II Strategic Value & Governance Impact
                </label>
                <textarea
                  rows={3}
                  value={strategicValue}
                  onChange={(e) => setStrategicValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 4. Strategic Smart Notes / Key Takeaways Array */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Key Facts & Statutory Mechanisms ({smartNotes.length})
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Bulleted analytical points presented in study card capsules.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSmartNotes([...smartNotes, ''])}
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition font-medium"
                  >
                    <Plus className="h-3 w-3" /> Add Point
                  </button>
                </div>

                <div className="space-y-2">
                  {smartNotes.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[11px] font-mono text-amber-400/80 pt-1 shrink-0">
                        #{idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={point}
                        placeholder="e.g. Seventh Schedule Delimitation: Agriculture is strictly State List Entry 14..."
                        onChange={(e) => {
                          const updated = [...smartNotes];
                          updated[idx] = e.target.value;
                          setSmartNotes(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-y"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...smartNotes];
                          updated.splice(idx, 1);
                          setSmartNotes(updated);
                        }}
                        className="text-slate-500 hover:text-rose-400 pt-1.5 transition shrink-0"
                        title="Delete point"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Backward Linkages (Slide 4 Grid Anchors) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Backward Linkages & Doctrinal Anchors
                    </label>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      backwardLinkages.length === 6
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                    }`}>
                      {backwardLinkages.length}/6 Anchors (3x2 Grid)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBackwardLinkages([...backwardLinkages, { title: '', anchor: '', description: '' }])
                    }
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Anchor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {backwardLinkages.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">Anchor #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...backwardLinkages];
                            updated.splice(idx, 1);
                            setBackwardLinkages(updated);
                          }}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Delete anchor"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Title (e.g. Article 263 (Inter-State Council))"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...backwardLinkages];
                          updated[idx].title = e.target.value;
                          updated[idx].anchor = e.target.value;
                          setBackwardLinkages(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-sky-400 font-bold focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="text"
                        placeholder="1-sentence doctrinal deconstruction..."
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...backwardLinkages];
                          updated[idx].description = e.target.value;
                          setBackwardLinkages(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Prelims Drill: Rule vs Examiner Trap with is_correct Boolean Switcher */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                      Prelims Drill: Rule vs. Examiner Trap ({prelimsPoints.length})
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Toggle whether the statement is factually correct or a designed distractor trap.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPrelimsPoints([
                        ...prelimsPoints,
                        { statement: '', rule: '', explanation: '', trap: '', is_correct: false },
                      ])
                    }
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Question Item
                  </button>
                </div>

                <div className="space-y-3">
                  {prelimsPoints.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3 shadow-inner"
                    >
                      {/* Item Header & is_correct Action Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-bold text-sky-400 font-mono tracking-wider">
                            STATEMENT #{idx + 1}
                          </span>

                          {/* IS_CORRECT BOOLEAN SWITCHER */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...prelimsPoints];
                              updated[idx].is_correct = !updated[idx].is_correct;
                              setPrelimsPoints(updated);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wide border transition-all ${
                              item.is_correct
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50 hover:bg-emerald-900/40 shadow-sm shadow-emerald-500/10'
                                : 'bg-rose-950/60 text-rose-400 border-rose-500/50 hover:bg-rose-900/40 shadow-sm shadow-rose-500/10'
                            }`}
                          >
                            {item.is_correct ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span>STATEMENT IS TRUE</span>
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 text-rose-400" />
                                <span>STATEMENT IS FALSE (EXAMINER TRAP)</span>
                              </>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...prelimsPoints];
                            updated.splice(idx, 1);
                            setPrelimsPoints(updated);
                          }}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Delete statement"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Rule / Statement Input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Statement / Examiner Proposition:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PM-KISAN is a Centrally Sponsored Scheme funded 60:40..."
                          value={item.statement || item.rule}
                          onChange={(e) => {
                            const updated = [...prelimsPoints];
                            updated[idx].statement = e.target.value;
                            updated[idx].rule = e.target.value;
                            setPrelimsPoints(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Trap Distinction / Forensic Explanation Input */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                          Forensic Explanation & Distractor Analysis:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Explain why this trap triggers or provide the exact statutory/constitutional basis..."
                          value={item.explanation || item.trap}
                          onChange={(e) => {
                            const updated = [...prelimsPoints];
                            updated[idx].explanation = e.target.value;
                            updated[idx].trap = e.target.value;
                            setPrelimsPoints(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 leading-relaxed focus:outline-none focus:border-amber-400 resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Mains Analytical Question */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">
                    Mains Analytical Practice Question (15 Marks, 250 Words)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">GS Paper II Directive</span>
                </div>
                <textarea
                  rows={3}
                  value={mainsQuestion}
                  onChange={(e) => setMainsQuestion(e.target.value)}
                  placeholder="Critically evaluate... In light of Seventh Schedule entries, discuss..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Bottom Save Bar */}
              <div className="pt-2">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl text-xs font-bold text-slate-950 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? 'Syncing Changes to Cloudflare R2...' : 'Commit Changes to R2 & Flush Cache'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Database className="h-8 w-8 text-slate-700" />
              <span>Select a smart note from the R2 queue on the left to begin editing.</span>
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON Inspector & Injection Modal */}
      {showRawJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-slate-800">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200">Raw JSON Editor & Injector</h3>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
                  Direct Paste Mode
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyRawJson}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition font-medium"
                >
                  {copiedRaw ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedRaw ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRawJsonModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Parse Error Alert */}
            {jsonParseError && (
              <div className="px-4 py-2.5 bg-rose-950/60 border-b border-rose-800 text-rose-300 text-[11px] flex items-center gap-2 font-mono">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{jsonParseError}</span>
              </div>
            )}

            {/* Editable Textarea Body */}
            <div className="relative flex-1 p-3 bg-slate-950 flex flex-col min-h-[480px]">
              <textarea
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  if (jsonParseError) setJsonParseError(null);
                }}
                placeholder="Paste full raw JSON here..."
                spellCheck={false}
                className="w-full h-full flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-sky-200 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/30 resize-none selection:bg-amber-400/20"
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Paste the corrected JSON above and click <b>Apply to Studio Fields</b> to review before saving.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRawJsonModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPastedJson}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-amber-500/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply to Studio Fields
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}