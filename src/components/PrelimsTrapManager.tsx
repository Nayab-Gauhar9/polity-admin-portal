import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Save, 
  RefreshCw, 
  Layers, 
  AlertCircle,
  Clock,
  Edit3,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface TrapCampaign {
  id: number;
  article_id: number | null;
  article_number: string;
  title: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'FAILED';
  caption: string;
  slides_payload: any;
  image_paths: string[];
  created_at: string;
}

export function PrelimsTrapManager() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [filterSource] = useState<'ALL' | 'ARTICLE' | 'DOSSIER' | 'PYQ_MUTATION'>('ALL');
  const [renderTimestamp, setRenderTimestamp] = useState<number>(Date.now());
  
  // Generation input states
  const [trapType, setTrapType] = useState<'article' | 'dossier' | 'pyq'>('article');
  const [targetInput, setTargetInput] = useState<string>('1');
  const [selectedFormat, setSelectedFormat] = useState<string>('STATEMENT_I_II');

  // Editable draft states
  const [questionStemDraft, setQuestionStemDraft] = useState<string>('');
  const [correctOptionDraft, setCorrectOptionDraft] = useState<string>('B');
  const [eliminationHeuristicDraft, setEliminationHeuristicDraft] = useState<string>('');
  const [captionDraft, setCaptionDraft] = useState<string>('');

  // Fetch queue specifically for traps (article_number starting with TRAP:)
  const { data: campaigns = [], isLoading, isError, error } = useQuery<TrapCampaign[]>({
    queryKey: ['trapCampaigns', filterSource],
    queryFn: async () => {
      const res = await apiClient.get('/api/admin/social/queue?status=ALL');
      const allCamps: TrapCampaign[] = res.data;
      const traps = allCamps.filter((c) => c.article_number?.startsWith('TRAP:'));
      
      if (filterSource === 'ALL') return traps;
      return traps.filter((c) => {
        const payload = c.slides_payload || {};
        const srcType = payload.source_type || '';
        return srcType.toUpperCase() === filterSource;
      });
    },
  });

  // Automatically select first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
      setCurrentSlideIndex(0);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Sync drafts when selected campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      setCaptionDraft(selectedCampaign.caption || '');
      const payload = selectedCampaign.slides_payload;
      if (payload) {
        setQuestionStemDraft(payload.question_stem || '');
        setCorrectOptionDraft(payload.correct_option || 'B');
        setEliminationHeuristicDraft(payload.elimination_heuristic || '');
      }
    } else {
      setCaptionDraft('');
      setQuestionStemDraft('');
      setCorrectOptionDraft('B');
      setEliminationHeuristicDraft('');
    }
  }, [selectedCampaign]);

  const totalSlides = 4; // Distractor traps are always 4 slides

  // Mutation: Generate Trap
  const generateTrapMutation = useMutation({
    mutationFn: async () => {
      const trimmed = targetInput.trim();
      let endpoint = '/api/admin/social/generate/trap/article';
      let payload: any = { format: selectedFormat };

      if (trapType === 'article') {
        endpoint = '/api/admin/social/generate/trap/article';
        payload.article = trimmed;
      } else if (trapType === 'dossier') {
        endpoint = '/api/admin/social/generate/trap/dossier';
        payload.issue_slug = trimmed;
      } else if (trapType === 'pyq') {
        endpoint = '/api/admin/social/generate/trap/pyq';
        payload.pyq_id = parseInt(trimmed, 10);
      }

      const res = await apiClient.post(endpoint, payload);
      return res.data;
    },
    onSuccess: (resData: any) => {
      setRenderTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ['trapCampaigns'] });
      const newId = resData.campaign_id || resData.id;
      if (newId) {
        setSelectedCampaignId(newId);
        setCurrentSlideIndex(0);
      }
    },
  });

  // Mutation: Amend payload & re-render PNGs
  const amendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCampaign) return;
      
      const updatedPayload = {
        ...selectedCampaign.slides_payload,
        question_stem: questionStemDraft,
        correct_option: correctOptionDraft,
        elimination_heuristic: eliminationHeuristicDraft,
      };

      const res = await apiClient.put(`/api/admin/social/queue/${selectedCampaign.id}/amend`, {
        slides_payload: updatedPayload,
        caption: captionDraft,
      });
      return res.data;
    },
    onSuccess: () => {
      setRenderTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ['trapCampaigns'] });
    },
    onError: (err: any) => {
      console.error("Trap amend failed:", err.response?.data || err.message);
    }
  });

  // Mutation: Approve & Publish
  const approveMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await apiClient.post(`/api/admin/social/queue/${campaignId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trapCampaigns'] });
    },
  });

  // Safe CDN Image Resolver
  const previewImageUrl = useMemo(() => {
    const raw = selectedCampaign?.image_paths?.[currentSlideIndex];
    if (!raw) return null;

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const sep = raw.includes('?') ? '&' : '?';
      return `${raw}${sep}v=${renderTimestamp}`;
    }

    const backendBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    return `${backendBaseUrl}${raw}?t=${renderTimestamp}`;
  }, [selectedCampaign, currentSlideIndex, renderTimestamp]);

  return (
    <div className="space-y-6">
      {/* Studio Header & Trigger Controls */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-900/80 border border-indigo-500/20 rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-bold text-slate-100">Prelims Distractor Trap Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Engineered 4-slide Instagram drills exposing cognitive blindspots across Articles, Living Dossiers, and PYQs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Trap Source Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 w-full xl:w-auto">
            <select
              value={trapType}
              onChange={(e) => {
                const val = e.target.value as any;
                setTrapType(val);
                if (val === 'article') setTargetInput('1');
                else if (val === 'dossier') setTargetInput('inter-state-water-disputes-mahanadi');
                else if (val === 'pyq') setTargetInput('102');
              }}
              className="bg-slate-900 border border-slate-700 text-xs text-indigo-300 font-medium px-2.5 py-1.5 rounded focus:outline-none"
            >
              <option value="article">Article</option>
              <option value="dossier">Dossier Slug</option>
              <option value="pyq">PYQ ID</option>
            </select>

            <input
              type="text"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={trapType === 'article' ? 'e.g. 72' : trapType === 'dossier' ? 'slug...' : 'PYQ #'}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none w-28 xl:w-32"
            />

            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-300 px-2.5 py-1.5 rounded focus:outline-none"
            >
              <option value="STATEMENT_I_II">Statement-I & II</option>
              <option value="HOW_MANY">How Many</option>
              <option value="STANDARD_BRACKET">Standard Bracket</option>
            </select>

            <button
              onClick={() => generateTrapMutation.mutate()}
              disabled={generateTrapMutation.isPending || !targetInput.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 active:scale-95 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50 shrink-0 ml-auto xl:ml-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generateTrapMutation.isPending ? 'animate-spin' : ''}`} />
              {generateTrapMutation.isPending ? 'Generating...' : 'Generate Drill'}
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-rose-950/30 border border-rose-800 text-rose-300 text-xs p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Failed to load trap queue: {(error as any)?.message || 'Endpoint error'}</span>
        </div>
      )}

      {/* Main Dual-Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trap Queue (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Trap Queue ({campaigns.length})
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              4-Slide Carousel
            </span>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Loading trap campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No prelims traps generated yet.</div>
            ) : (
              campaigns.map((camp) => {
                const isSelected = camp.id === selectedCampaignId;
                const payload = camp.slides_payload || {};

                return (
                  <div
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaignId(camp.id);
                      setCurrentSlideIndex(0);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-slate-200">{camp.article_number}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          camp.status === 'PUBLISHED' || camp.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
                      {payload.topic || camp.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(camp.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-amber-400/80 font-mono text-[9px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
                        {payload.question_format || 'STATEMENT_I_II'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Slide Preview & Inspector Form (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedCampaign ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
              {/* Cockpit Actions Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">
                      {selectedCampaign.slides_payload?.topic || selectedCampaign.title}
                    </span>
                    <span className="text-xs text-amber-400 font-mono">
                      • Slide {currentSlideIndex + 1} of 4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Archetype: <span className="text-slate-200 font-semibold">{selectedCampaign.slides_payload?.trap_archetype}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => amendMutation.mutate()}
                    disabled={amendMutation.isPending}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {amendMutation.isPending ? 'Re-rendering PNGs...' : 'Save & Re-render'}
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(selectedCampaign.id)}
                    disabled={approveMutation.isPending || selectedCampaign.status === 'PUBLISHED'}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {selectedCampaign.status === 'PUBLISHED' ? 'Published' : 'Approve & Publish'}
                  </button>
                </div>
              </div>

              {/* Preview & Slide Editor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Visual Slide Display */}
                <div className="space-y-3">
                  <div className="relative aspect-[4/5] bg-black rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
                    {previewImageUrl ? (
                      <img
                        key={`${previewImageUrl}-${selectedCampaign.id}-${currentSlideIndex}-${renderTimestamp}`}
                        src={previewImageUrl}
                        alt={`Slide ${currentSlideIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-600 text-xs">No preview rendered yet</div>
                    )}
                  </div>

                  {/* Carousel Slide Navigation Buttons (1 to 4) */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentSlideIndex === 0}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <div className="flex gap-2">
                      {Array.from({ length: totalSlides }, (_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            currentSlideIndex === idx
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))}
                      disabled={currentSlideIndex >= totalSlides - 1}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Adaptive Trap Inspector & Editor */}
                <div className="space-y-3 bg-slate-950/80 p-4 rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                      <span>INSPECT & EDIT SLIDE {currentSlideIndex + 1}</span>
                    </div>
                    <span className="text-[10px] text-amber-400/80 bg-amber-950/40 px-2 py-0.5 rounded font-mono">
                      {selectedCampaign.slides_payload?.question_format}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Slide 1 Controls: Question Stem & Correct Option */}
                    {currentSlideIndex === 0 && (
                      <>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Question Stem (Slide 1 Header)
                          </label>
                          <textarea
                            rows={3}
                            value={questionStemDraft}
                            onChange={(e) => setQuestionStemDraft(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Correct Option Key (A, B, C, or D)
                          </label>
                          <input
                            type="text"
                            maxLength={1}
                            value={correctOptionDraft}
                            onChange={(e) => setCorrectOptionDraft(e.target.value.toUpperCase())}
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-amber-400 font-bold text-center text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="bg-slate-900/50 p-3 rounded border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            Statements Payload Preview:
                          </span>
                          <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {JSON.stringify(selectedCampaign.slides_payload?.statements_payload, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}

                    {/* Slide 2 Controls: Verdict & Cognitive Blindspot */}
                    {currentSlideIndex === 1 && (
                      <div className="space-y-3">
                        <div className="bg-indigo-950/30 p-2.5 rounded border border-indigo-900/50">
                          <span className="text-[10px] text-indigo-300 font-bold block mb-1">
                            Correct Answer Option ({selectedCampaign.slides_payload?.correct_option}):
                          </span>
                          <p className="text-xs text-slate-200">
                            {selectedCampaign.slides_payload?.options?.[selectedCampaign.slides_payload?.correct_option]}
                          </p>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Why Candidates Falter (Cognitive Blindspot)
                          </label>
                          <textarea
                            rows={4}
                            value={selectedCampaign.slides_payload?.conceptual_analysis?.why_candidates_falter || ''}
                            disabled
                            className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs cursor-not-allowed"
                          />
                          <p className="text-[9px] text-slate-500 mt-1">Generated by Groq 120B (Grounding Verified)</p>
                        </div>
                      </div>
                    )}

                    {/* Slide 3 Controls: Jurisprudence & Legal Ratio */}
                    {currentSlideIndex === 2 && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Core Constitutional Doctrine
                          </label>
                          <input
                            type="text"
                            value={selectedCampaign.slides_payload?.conceptual_analysis?.core_constitutional_doctrine || ''}
                            disabled
                            className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1.5 text-amber-400 text-xs cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Substantive Legal Holding
                          </label>
                          <textarea
                            rows={4}
                            value={selectedCampaign.slides_payload?.conceptual_analysis?.substantive_legal_holding || ''}
                            disabled
                            className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs cursor-not-allowed"
                          />
                        </div>
                      </div>
                    )}

                    {/* Slide 4 Controls: Exam Heuristic */}
                    {currentSlideIndex === 3 && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Elimination Heuristic (60-Second Strategy)
                          </label>
                          <textarea
                            rows={5}
                            value={eliminationHeuristicDraft}
                            onChange={(e) => setEliminationHeuristicDraft(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable Social Post Caption Card */}
              <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                    <span>SYNCHRONIZED TRAP POST CAPTION & HASHTAGS</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Saved on "Save & Re-render"</span>
                </div>
                <textarea
                  rows={4}
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="Enter social post caption..."
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs text-slate-300 leading-relaxed focus:outline-none focus:border-amber-500 resize-y"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-16 text-center text-slate-500 text-xs">
              Select or generate a Prelims Distractor Trap from the queue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}