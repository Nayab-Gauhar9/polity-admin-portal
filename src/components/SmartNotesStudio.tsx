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
  Sparkles
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

export default function SmartNotesStudio() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [sortByRecent, setSortByRecent] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Form Content State
  const [headline, setHeadline] = useState('');
  const [subHeadline, setSubHeadline] = useState('');
  const [pibContext, setPibContext] = useState('');
  const [strategicValue, setStrategicValue] = useState('');
  const [smartNotes, setSmartNotes] = useState<string[]>([]);
  const [mainsQuestion, setMainsQuestion] = useState('');
  const [backwardLinkages, setBackwardLinkages] = useState<any[]>([]);
  const [prelimsPoints, setPrelimsPoints] = useState<any[]>([]);

  // 1. Fetch R2 Queue
  const { data: queueResponse, isLoading } = useQuery<{ items: QueueItem[]; chapters: string[] }>({
    queryKey: ['r2SmartNotesQueue'],
    queryFn: async () => {
      const res = await coreApi.get('/api/admin/smart-notes/queue?limit=300');
      return {
        items: res.data.items || [],
        chapters: res.data.chapters || []
      };
    },
  });

  const rawQueue = queueResponse?.items || [];
  const chaptersList = queueResponse?.chapters || [];

  // Filter & Sort Pipeline
  const filteredQueue = useMemo(() => {
    let list = [...rawQueue];

    // Filter by Chapter
    if (selectedChapter !== 'ALL') {
      list = list.filter((item) => item.chapter === selectedChapter);
    }

    // Filter by Search Query
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

    // Sort by PRID (Recent vs Default)
    if (sortByRecent) {
      list.sort((a, b) => (b.prid_num || parseInt(b.prid, 10) || 0) - (a.prid_num || parseInt(a.prid, 10) || 0));
    }

    return list;
  }, [rawQueue, selectedChapter, searchQuery, sortByRecent]);

  // Auto-select first item when queue loads or filters change
  useEffect(() => {
    if (filteredQueue.length > 0 && !selectedKey) {
      loadDetail(filteredQueue[0].object_key);
    }
  }, [filteredQueue, selectedKey]);

  // 2. Fetch specific Note Detail
  const loadDetail = async (key: string) => {
    setSelectedKey(key);
    setStatusMessage('');
    try {
      const res = await coreApi.get(`/api/admin/smart-notes/detail?object_key=${encodeURIComponent(key)}`);
      const raw = res.data.data || {};

      setHeadline(raw.headline || raw.title || '');
      setSubHeadline(raw.sub_headline || '');
      setPibContext(raw.pib_executive_context || raw.summary || '');
      setStrategicValue(raw.strategic_upsc_value || raw.why_it_matters || '');
      setMainsQuestion(raw.mains_analytical_question || raw.mains_question || '');

      // Normalize smart_notes bullet array
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
        links.map((item: any) =>
          typeof item === 'object' && item !== null
            ? {
                title: item.title || item.anchor || '',
                description: item.description || item.desc || '',
              }
            : { title: String(item), description: '' }
        )
      );

      // Normalize prelims traps/drills
      const prelims = raw.prelims_practice_points || [];
      setPrelimsPoints(
        prelims.map((item: any) =>
          typeof item === 'object' && item !== null
            ? {
                rule: item.rule || item.statement || '',
                trap: item.trap || item.explanation || '',
              }
            : { rule: String(item), trap: '' }
        )
      );
    } catch (err) {
      console.error('Failed to load R2 note detail', err);
    }
  };

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        object_key: selectedKey,
        headline,
        sub_headline: subHeadline,
        pib_executive_context: pibContext,
        summary: pibContext,
        strategic_upsc_value: strategicValue,
        why_it_matters: strategicValue,
        smart_notes: smartNotes,
        backward_linkages: backwardLinkages,
        prelims_practice_points: prelimsPoints,
        mains_analytical_question: mainsQuestion,
        mains_question: mainsQuestion,
        re_render_slides: false,
      };
      const res = await coreApi.put('/api/admin/smart-notes/save', payload);
      return res.data;
    },
    onSuccess: () => {
      setStatusMessage('Changes persisted to R2 and Redis cache invalidated!');
      queryClient.invalidateQueries({ queryKey: ['r2SmartNotesQueue'] });
      setTimeout(() => setStatusMessage(''), 5000);
    },
    onError: (err: any) => {
      setStatusMessage(`Error: ${err.response?.data?.detail || err.message}`);
    },
  });

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-bold text-slate-100">R2 Smart Notes Editor</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit and edit note content directly in Cloudflare R2 under{' '}
            <code className="text-sky-400 font-mono">pib/smart_notes/</code>.
          </p>
        </div>

        {selectedKey && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving to R2...' : 'Save Changes to R2'}
          </button>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            statusMessage.startsWith('Error')
              ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
          }`}
        >
          {statusMessage.startsWith('Error') ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Dual Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Note Queue (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Notes ({filteredQueue.length})
              </h2>
            </div>
            
            {/* Sort Toggle */}
            <button
              onClick={() => setSortByRecent(!sortByRecent)}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition ${
                sortByRecent
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Toggle descending PRID sort"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortByRecent ? 'Recent First' : 'A-Z Sort'}
            </button>
          </div>

          {/* Chapter Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-3 w-3 text-sky-400" /> Chapter Filter:
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setSelectedKey('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 truncate"
            >
              <option value="ALL">All Chapters ({rawQueue.length} notes)</option>
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

          {/* Search Filter */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by headline or PRID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Queue List */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Scanning R2 bucket...</div>
            ) : filteredQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No notes found for this filter.</div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedKey === item.object_key;
                return (
                  <div
                    key={item.object_key}
                    onClick={() => loadDetail(item.object_key)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded font-bold">
                        PRID: {item.prid}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {item.chapter}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 line-clamp-2">{item.headline}</p>
                    <p className="text-[10px] text-slate-500 truncate">{item.topic}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Document Form Editor (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
          {selectedKey ? (
            <div className="space-y-6">
              {/* Note Key Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-mono text-slate-400 truncate max-w-xl">
                    {selectedKey}
                  </span>
                </div>
              </div>

              {/* 1. Headline & Subheadline */}
              <div className="space-y-3">
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Sub-Headline</label>
                  <input
                    type="text"
                    value={subHeadline}
                    onChange={(e) => setSubHeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-sky-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 2. Executive Context / Summary */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Executive Context / Summary
                </label>
                <textarea
                  rows={4}
                  value={pibContext}
                  onChange={(e) => setPibContext(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 3. Strategic UPSC Value */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  GS-II Strategic Value & Doctrinal Anchor
                </label>
                <textarea
                  rows={4}
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
                      Strategic Smart Notes / Key Takeaways ({smartNotes.length})
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Modular analytical points rendered in the study capsules.
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

                <div className="space-y-2.5">
                  {smartNotes.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[11px] font-mono text-amber-400/80 pt-1 shrink-0">
                        #{idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={point}
                        placeholder="e.g. Institutional Mechanism: Details of statutory provisions..."
                        onChange={(e) => {
                          const updated = [...smartNotes];
                          updated[idx] = e.target.value;
                          setSmartNotes(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-y"
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

              {/* 5. Backward Linkages (Constitutional Anchors) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Backward Linkages & Constitutional Anchors
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBackwardLinkages([...backwardLinkages, { title: '', description: '' }])
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
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">Anchor #{idx + 1}</span>
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
                        placeholder="Title (e.g., Article 51 (DPSP))"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...backwardLinkages];
                          updated[idx].title = e.target.value;
                          setBackwardLinkages(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-sky-400 font-bold focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="text"
                        placeholder="Description (doctrine or mechanism)"
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

              {/* 6. Prelims Practice Points & Traps */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Prelims Drill: Rule vs. Examiner Trap
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPrelimsPoints([...prelimsPoints, { rule: '', trap: '' }])
                    }
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Point
                  </button>
                </div>

                {prelimsPoints.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-sky-400 font-bold uppercase">
                        Rule #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...prelimsPoints];
                          updated.splice(idx, 1);
                          setPrelimsPoints(updated);
                        }}
                        className="text-slate-500 hover:text-rose-400 transition"
                        title="Delete point"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Factual statement / rule..."
                      value={item.rule}
                      onChange={(e) => {
                        const updated = [...prelimsPoints];
                        updated[idx].rule = e.target.value;
                        setPrelimsPoints(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />

                    <div>
                      <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">
                        UPSC Examiner Trap
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Specific distractor trap..."
                        value={item.trap}
                        onChange={(e) => {
                          const updated = [...prelimsPoints];
                          updated[idx].trap = e.target.value;
                          setPrelimsPoints(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 7. Mains Analytical Question */}
              <div className="pt-3 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mains Analytical Question (15 Marks, 250 Words)
                </label>
                <textarea
                  rows={3}
                  value={mainsQuestion}
                  onChange={(e) => setMainsQuestion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Bottom Save Action */}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving to R2 Storage...' : 'Save Changes to R2'}
              </button>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Select a smart note from the R2 queue on the left to edit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}