import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Save, 
  RefreshCw, 
  Layers, 
  AlertCircle,
  Clock,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface SlideItem {
  slide_num: string;
  tier_badge: string;
  headline: string;
  subheadline?: string;
  thesis?: string;
  chips?: string[];
  colonial_title?: string;
  colonial_context?: string;
  cad_quote?: string;
  cad_speaker?: string;
  analytical_insight?: string;
  points?: Array<{ title: string; desc: string }>;
  condition_precedent?: string;
  legislative_supremacy?: string;
  justiciability?: string;
  rows?: Array<{ param: string; rule: string; trap: string }>;
  dimensions?: Array<[string, string]>;
  pitch?: string;
  website?: string;
  telegram?: string;
  instagram?: string;
}

interface Campaign {
  id: number;
  article_id: number;
  article_number: string;
  status: 'PENDING_APPROVAL' | 'APPROVED';
  caption: string;
  slides_payload: { slides: SlideItem[] } | SlideItem[];
  image_paths: string[];
  created_at: string;
}

export function SocialManager() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED'>('PENDING');
  const [renderTimestamp, setRenderTimestamp] = useState<number>(Date.now());
  
  // Generation input states
  const [targetArticleNumber, setTargetArticleNumber] = useState<string>('Article 1');
  const [selectedTier, setSelectedTier] = useState<string>('TIER_1');

  // Slide draft state for real-time form editing
  const [currentSlideDraft, setCurrentSlideDraft] = useState<SlideItem | null>(null);

  // Editable caption draft state
  const [captionDraft, setCaptionDraft] = useState<string>('');

  // Fetch campaign queue from newspaper-upsc-ai backend
  const { data: campaigns = [], isLoading, isError, error } = useQuery<Campaign[]>({
    queryKey: ['socialCampaigns', filterStatus],
    queryFn: async () => {
      const statusParam = filterStatus === 'ALL' 
        ? '' 
        : `?status=${filterStatus === 'PENDING' ? 'PENDING_APPROVAL' : 'APPROVED'}`;
      const res = await apiClient.get(`/api/admin/social/queue${statusParam}`);
      return res.data;
    },
  });

  // Automatically select the first campaign if none selected
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
      setCurrentSlideIndex(0);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Sync caption draft when selected campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      setCaptionDraft(selectedCampaign.caption || '');
    } else {
      setCaptionDraft('');
    }
  }, [selectedCampaign]);

  // Normalize slides into a clean array regardless of backend payload structure
  const currentSlidesList: SlideItem[] = useMemo(() => {
    if (!selectedCampaign?.slides_payload) return [];
    if (Array.isArray(selectedCampaign.slides_payload)) {
      return selectedCampaign.slides_payload;
    }
    if (Array.isArray((selectedCampaign.slides_payload as any)?.slides)) {
      return (selectedCampaign.slides_payload as any).slides;
    }
    return [];
  }, [selectedCampaign]);

  const totalSlides = Math.max(currentSlidesList.length, 6);

  // Synchronize local editable form whenever active campaign or slide changes
  useEffect(() => {
    if (currentSlidesList[currentSlideIndex]) {
      setCurrentSlideDraft(JSON.parse(JSON.stringify(currentSlidesList[currentSlideIndex])));
    } else {
      setCurrentSlideDraft(null);
    }
  }, [currentSlidesList, currentSlideIndex]);

  // Mutation: Generate new campaign
  const generateMutation = useMutation({
    mutationFn: async () => {
      const trimmedQuery = targetArticleNumber.trim();
      const res = await apiClient.post('/api/admin/social/generate', {
        article: trimmedQuery,
        article_number: trimmedQuery,
        tier: selectedTier,
      });
      return res.data;
    },
    onSuccess: (newCampaign: any) => {
      setRenderTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ['socialCampaigns'] });
      const newId = newCampaign.id || newCampaign.campaign_id;
      if (newId) {
        setSelectedCampaignId(newId);
        setCurrentSlideIndex(0);
      }
    },
  });

  // Mutation: Amend payload & re-render PNGs (includes updated caption)
  const amendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCampaign || !currentSlideDraft) return;
      const updatedSlides = [...currentSlidesList];
      updatedSlides[currentSlideIndex] = currentSlideDraft;

      const res = await apiClient.put(`/api/admin/social/queue/${selectedCampaign.id}/amend`, {
        slides_payload: { slides: updatedSlides },
        caption: captionDraft,
      });
      return res.data;
    },
    onSuccess: () => {
      setRenderTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ['socialCampaigns'] });
    },
    onError: (err: any) => {
      console.error("Amend failed:", err.response?.data || err.message);
    }
  });

  // Mutation: Approve campaign
  const approveMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await apiClient.post(`/api/admin/social/queue/${campaignId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialCampaigns'] });
    },
  });

  // Resolve preview image URL against VITE_API_BASE_URL with cache-busting timestamp
  const backendBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const rawPreviewPath = selectedCampaign?.image_paths?.[currentSlideIndex];
  const previewImageUrl = rawPreviewPath
    ? `${rawPreviewPath.startsWith('http') ? rawPreviewPath : `${backendBaseUrl}${rawPreviewPath}`}?t=${renderTimestamp}`
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Studio Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-slate-100">Programmatic Social Carousel Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate 6-slide visual carousels with Groq gpt-oss-120b and review before publication.
          </p>
        </div>

        {/* Generate Direct Trigger */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={targetArticleNumber}
            onChange={(e) => setTargetArticleNumber(e.target.value)}
            placeholder="e.g. Article 1"
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 w-32"
          />
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            <option value="TIER_1">Tier 1: Architectural</option>
            <option value="TIER_2">Tier 2: Institutional</option>
            <option value="TIER_3">Tier 3: Procedural</option>
          </select>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {generateMutation.isPending ? 'Synthesizing...' : 'Generate Carousel'}
          </button>
        </div>
      </div>

      {isError && (
        <div className="bg-rose-950/30 border border-rose-800 text-rose-300 text-xs p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Failed to load campaign queue: {(error as any)?.message || 'Endpoint not found'}</span>
        </div>
      )}

      {/* Main Dual-Pane Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Campaign Queue List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Campaign Queue ({campaigns.length})
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              {(['PENDING', 'ALL'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-1 rounded capitalize transition ${
                    filterStatus === st
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No campaigns queued.</div>
            ) : (
              campaigns.map((camp) => {
                const isSelected = camp.id === selectedCampaignId;
                const campSlides = Array.isArray(camp.slides_payload)
                  ? camp.slides_payload
                  : (camp.slides_payload as any)?.slides || [];
                return (
                  <div
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaignId(camp.id);
                      setCurrentSlideIndex(0);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-950/20 border-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{camp.article_number}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          camp.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {campSlides[0]?.headline || 'Jurisprudential Framework'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(camp.created_at).toLocaleDateString()}
                      </span>
                      <span>{campSlides.length || 6} Slides</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Slide Preview & Amendment Form (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedCampaign ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
              {/* Cockpit Actions Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">
                    {selectedCampaign.article_number}
                  </span>
                  <span className="text-xs text-slate-400">
                    • Slide {currentSlideIndex + 1} of {totalSlides}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => amendMutation.mutate()}
                    disabled={amendMutation.isPending}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {amendMutation.isPending ? 'Re-rendering PNG...' : 'Save & Re-render'}
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(selectedCampaign.id)}
                    disabled={approveMutation.isPending || selectedCampaign.status === 'APPROVED'}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {selectedCampaign.status === 'APPROVED' ? 'Approved' : 'Approve Campaign'}
                  </button>
                </div>
              </div>

              {/* Preview & Slide Editor Split Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Visual Slide Display */}
                <div className="space-y-3">
                  <div className="relative aspect-[4/5] bg-black rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
                    {previewImageUrl ? (
                      <img
                        key={`${previewImageUrl}-${selectedCampaign.id}-${currentSlideIndex}`}
                        src={previewImageUrl}
                        alt={`Slide ${currentSlideIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-600 text-xs">No preview rendered yet</div>
                    )}
                  </div>

                  {/* Carousel Slide Navigation Buttons (1 to 6) */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentSlideIndex === 0}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalSlides }, (_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`w-6 h-6 rounded text-[11px] font-bold transition ${
                            currentSlideIndex === idx
                              ? 'bg-indigo-600 text-white shadow'
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

                {/* Live Form Editor for Current Slide */}
                <div className="space-y-3 bg-slate-950/80 p-4 rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                      <span>EDIT SLIDE {currentSlideIndex + 1} CONTENT</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Auto-synced</span>
                  </div>

                  {currentSlideDraft ? (
                    <div className="space-y-3 text-xs">
                      {/* Common: Tier Badge */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                          Category Badge (Pill)
                        </label>
                        <input
                          type="text"
                          value={currentSlideDraft.tier_badge || ''}
                          onChange={(e) =>
                            setCurrentSlideDraft({ ...currentSlideDraft, tier_badge: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Common: Headline */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                          Slide Main Headline
                        </label>
                        <input
                          type="text"
                          value={currentSlideDraft.headline || ''}
                          onChange={(e) =>
                            setCurrentSlideDraft({ ...currentSlideDraft, headline: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Archetype: Slide 1 (Hook / Thesis) */}
                      {currentSlideIndex === 0 && (
                        <>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Subheadline
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.subheadline || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, subheadline: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Analytical Thesis
                            </label>
                            <textarea
                              rows={4}
                              value={currentSlideDraft.thesis || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, thesis: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Context Chips (Comma-separated)
                            </label>
                            <input
                              type="text"
                              value={(currentSlideDraft.chips || []).join(', ')}
                              onChange={(e) =>
                                setCurrentSlideDraft({
                                  ...currentSlideDraft,
                                  chips: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </>
                      )}

                      {/* Archetype: Slide 2 (CAD Crucible) */}
                      {currentSlideIndex === 1 && (
                        <>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Colonial Roots / Statute Ancestry
                            </label>
                            <textarea
                              rows={3}
                              value={currentSlideDraft.colonial_context || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, colonial_context: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Constituent Assembly Debate Quote
                            </label>
                            <textarea
                              rows={3}
                              value={currentSlideDraft.cad_quote || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, cad_quote: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs italic focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              CAD Speaker
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.cad_speaker || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, cad_speaker: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Jurisprudential Paradox
                            </label>
                            <textarea
                              rows={3}
                              value={currentSlideDraft.analytical_insight || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, analytical_insight: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </>
                      )}

                      {/* Archetype: Slide 3 (Landmark Precedent) */}
                      {currentSlideIndex === 2 && (
                        <>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Subheadline
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.subheadline || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, subheadline: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] text-slate-400 font-medium block">
                              3 Doctrinal Legal Holding Points
                            </label>
                            {(currentSlideDraft.points || []).map((pt, pIdx) => (
                              <div key={pIdx} className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                                <input
                                  type="text"
                                  value={pt.title}
                                  onChange={(e) => {
                                    const pts = [...(currentSlideDraft.points || [])];
                                    pts[pIdx].title = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, points: pts });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                />
                                <textarea
                                  rows={2}
                                  value={pt.desc}
                                  onChange={(e) => {
                                    const pts = [...(currentSlideDraft.points || [])];
                                    pts[pIdx].desc = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, points: pts });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Archetype: Slide 4 (Rules vs. Traps Matrix) */}
                      {currentSlideIndex === 3 && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-400 font-medium block">
                            Procedural Matrix & Traps
                          </label>
                          {(currentSlideDraft.rows || []).map((row, rIdx) => (
                            <div key={rIdx} className="space-y-1.5 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                              <input
                                type="text"
                                value={row.param}
                                placeholder="Parameter name"
                                onChange={(e) => {
                                  const r = [...(currentSlideDraft.rows || [])];
                                  r[rIdx].param = e.target.value;
                                  setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              />
                              <input
                                type="text"
                                value={row.rule}
                                placeholder="Rule text"
                                onChange={(e) => {
                                  const r = [...(currentSlideDraft.rows || [])];
                                  r[rIdx].rule = e.target.value;
                                  setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sky-300 text-xs focus:outline-none focus:border-indigo-500"
                              />
                              <input
                                type="text"
                                value={row.trap}
                                placeholder="Exam trap text"
                                onChange={(e) => {
                                  const r = [...(currentSlideDraft.rows || [])];
                                  r[rIdx].trap = e.target.value;
                                  setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Archetype: Slide 5 (GS-II Dialectical Blueprint) */}
                      {currentSlideIndex === 4 && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-400 font-medium block">
                            Mains GS-II Dimensions
                          </label>
                          {(currentSlideDraft.dimensions || []).map((dim, dIdx) => (
                            <div key={dIdx} className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                              <input
                                type="text"
                                value={dim[0]}
                                onChange={(e) => {
                                  const d = [...(currentSlideDraft.dimensions || [])];
                                  d[dIdx] = [e.target.value, d[dIdx][1]];
                                  setCurrentSlideDraft({ ...currentSlideDraft, dimensions: d });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              />
                              <textarea
                                rows={2}
                                value={dim[1]}
                                onChange={(e) => {
                                  const d = [...(currentSlideDraft.dimensions || [])];
                                  d[dIdx] = [d[dIdx][0], e.target.value];
                                  setCurrentSlideDraft({ ...currentSlideDraft, dimensions: d });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Archetype: Slide 6 (Platform & Social Channels CTA) */}
                      {currentSlideIndex === 5 && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Subheadline
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.subheadline || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, subheadline: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Ecosystem Pitch
                            </label>
                            <textarea
                              rows={3}
                              value={currentSlideDraft.pitch || ''}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, pitch: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Website URL
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.website || 'politymentor.com'}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, website: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Telegram Link
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.telegram || 't.me/politymentor'}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, telegram: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Instagram Handle
                            </label>
                            <input
                              type="text"
                              value={currentSlideDraft.instagram || '@politymentor'}
                              onChange={(e) =>
                                setCurrentSlideDraft({ ...currentSlideDraft, instagram: e.target.value })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No slide payload found for Slide {currentSlideIndex + 1}.
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Instagram/LinkedIn Caption Card */}
              <div className="bg-slate-950/80 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                    <span>SYNCHRONIZED POST CAPTION & HASHTAGS</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Saved on "Save & Re-render"</span>
                </div>
                <textarea
                  rows={4}
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="Enter social post caption..."
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs text-slate-300 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-16 text-center text-slate-500 text-xs">
              Select an article campaign from the queue to review and amend slides.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}