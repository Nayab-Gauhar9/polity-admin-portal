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
  MessageSquare,
  Newspaper,
  BookOpen
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface SlideItem {
  slide_num: string;
  tier_badge: string;
  headline: string;
  subheadline?: string;
  thesis?: string;
  chips?: string[];
  // Article-wise specific
  colonial_title?: string;
  colonial_context?: string;
  cad_quote?: string;
  cad_speaker?: string;
  analytical_insight?: string;
  dimensions?: Array<[string, string]>;
  // PIB-specific
  notes?: Array<{ title: string; desc: string }>;
  points?: Array<{ title: string; desc: string }>;
  rows?: Array<{ param: string; rule: string; trap: string }>;
  mains_question?: string;
  // Shared Slide 6
  pitch?: string;
  website?: string;
  telegram?: string;
  instagram?: string;
}

interface Campaign {
  id: number;
  article_id: number;
  article_number: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'FAILED';
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
  const [captionDraft, setCaptionDraft] = useState<string>('');

  // Fetch campaign queue
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
  const isPibCampaign = selectedCampaign?.article_number?.startsWith('PIB:') ?? false;

  // Sync caption draft when selected campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      setCaptionDraft(selectedCampaign.caption || '');
    } else {
      setCaptionDraft('');
    }
  }, [selectedCampaign]);

  // Normalize slides into a clean array
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

  // Synchronize local editable form
  useEffect(() => {
    if (currentSlidesList[currentSlideIndex]) {
      setCurrentSlideDraft(JSON.parse(JSON.stringify(currentSlidesList[currentSlideIndex])));
    } else {
      setCurrentSlideDraft(null);
    }
  }, [currentSlidesList, currentSlideIndex]);

  // Mutation: Generate Article campaign
  const generateArticleMutation = useMutation({
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

  // Mutation: Generate Latest PIB campaign
  const generatePibMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/admin/social/generate/pib-latest');
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

  // Mutation: Amend payload & re-render PNGs
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

  // Mutation: Approve & Publish
  const approveMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await apiClient.post(`/api/admin/social/queue/${campaignId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialCampaigns'] });
    },
  });

  // Safe CDN Image Resolver
  const previewImageUrl = useMemo(() => {
    const raw = selectedCampaign?.image_paths?.[currentSlideIndex];
    if (!raw) return null;

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      // If it's a media.politymentor.com or CDN link, append simple cache-buster
      const sep = raw.includes('?') ? '&' : '?';
      return `${raw}${sep}v=${renderTimestamp}`;
    }

    // Relative local server path fallback
    const backendBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    return `${backendBaseUrl}${raw}?t=${renderTimestamp}`;
  }, [selectedCampaign, currentSlideIndex, renderTimestamp]);

  return (
    <div className="space-y-6">
      {/* Studio Header & Trigger Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-slate-100">Social Automation Cockpit</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Publish verified 6-slide visual carousels for Constitutional Articles and Daily PIB Releases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* PIB Trigger Button */}
          <button
            onClick={() => generatePibMutation.mutate()}
            disabled={generatePibMutation.isPending}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 shrink-0"
          >
            <Newspaper className={`h-3.5 w-3.5 ${generatePibMutation.isPending ? 'animate-spin' : ''}`} />
            {generatePibMutation.isPending ? 'Ingesting R2 Note...' : 'Generate Latest PIB Carousel'}
          </button>

          {/* Article Generator Controls */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400 ml-2" />
            <input
              type="text"
              value={targetArticleNumber}
              onChange={(e) => setTargetArticleNumber(e.target.value)}
              placeholder="e.g. Article 1"
              className="bg-transparent border-none text-xs text-slate-200 px-2 py-1.5 focus:outline-none w-28"
            />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none"
            >
              <option value="TIER_1">Tier 1</option>
              <option value="TIER_2">Tier 2</option>
              <option value="TIER_3">Tier 3</option>
            </select>
            <button
              onClick={() => generateArticleMutation.mutate()}
              disabled={generateArticleMutation.isPending}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3 py-1.5 rounded text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${generateArticleMutation.isPending ? 'animate-spin' : ''}`} />
              {generateArticleMutation.isPending ? 'Synthesizing...' : 'Generate Article'}
            </button>
          </div>
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
        {/* Left Column: Campaign Queue (4 cols) */}
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
                const isPib = camp.article_number.startsWith('PIB:');
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
                      <div className="flex items-center gap-1.5">
                        {isPib ? (
                          <Newspaper className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                        )}
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
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {campSlides[0]?.headline || 'Constitutional Dossier'}
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

        {/* Right Column: Slide Preview & Form Editor (8 cols) */}
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
                  {isPibCampaign && (
                    <span className="text-[10px] bg-amber-950/80 text-amber-400 border border-amber-800 px-2 py-0.5 rounded font-medium">
                      PIB Mode
                    </span>
                  )}
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

                {/* Adaptive Form Editor for Current Slide */}
                <div className="space-y-3 bg-slate-950/80 p-4 rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                      <span>EDIT SLIDE {currentSlideIndex + 1} CONTENT</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {isPibCampaign ? 'PIB Archetype' : 'Article Archetype'}
                    </span>
                  </div>

                  {currentSlideDraft ? (
                    <div className="space-y-3 text-xs">
                      {/* Common: Tier Badge */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                          Category Badge
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

                      {/* Subheadline */}
                      {currentSlideDraft.subheadline !== undefined && (
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
                      )}

                      {/* ================= SLIDE 1 ================= */}
                      {currentSlideIndex === 0 && (
                        <>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              Overview Thesis / Hook
                            </label>
                            <textarea
                              rows={3}
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

                      {/* ================= SLIDE 2 ================= */}
                      {currentSlideIndex === 1 && (
                        <>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium block mb-1">
                              {isPibCampaign ? 'Why It Matters Narrative' : 'Jurisprudential Paradox'}
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
                          {!isPibCampaign ? (
                            <>
                              <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-1">
                                  Colonial Context
                                </label>
                                <textarea
                                  rows={2}
                                  value={currentSlideDraft.colonial_context || ''}
                                  onChange={(e) =>
                                    setCurrentSlideDraft({ ...currentSlideDraft, colonial_context: e.target.value })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-1">
                                  CAD Quote
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
                            </>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-400 font-medium block">
                                Core Policy & Governance Directives
                              </label>
                              {(currentSlideDraft.points || []).map((pt, pIdx) => (
                                <div key={pIdx} className="space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800">
                                  <input
                                    type="text"
                                    value={pt.title}
                                    onChange={(e) => {
                                      const pts = [...(currentSlideDraft.points || [])];
                                      pts[pIdx].title = e.target.value;
                                      setCurrentSlideDraft({ ...currentSlideDraft, points: pts });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none"
                                  />
                                  <textarea
                                    rows={2}
                                    value={pt.desc}
                                    onChange={(e) => {
                                      const pts = [...(currentSlideDraft.points || [])];
                                      pts[pIdx].desc = e.target.value;
                                      setCurrentSlideDraft({ ...currentSlideDraft, points: pts });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* ================= SLIDE 3 ================= */}
                      {currentSlideIndex === 2 && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-400 font-medium block">
                            {isPibCampaign ? 'Smart Notes Dossier Cards' : 'Landmark Precedent Holdings'}
                          </label>
                          {(isPibCampaign ? currentSlideDraft.notes || [] : currentSlideDraft.points || []).map((item, idx) => (
                            <div key={idx} className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => {
                                  if (isPibCampaign) {
                                    const n = [...(currentSlideDraft.notes || [])];
                                    n[idx].title = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, notes: n });
                                  } else {
                                    const p = [...(currentSlideDraft.points || [])];
                                    p[idx].title = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, points: p });
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              />
                              <textarea
                                rows={2}
                                value={item.desc}
                                onChange={(e) => {
                                  if (isPibCampaign) {
                                    const n = [...(currentSlideDraft.notes || [])];
                                    n[idx].desc = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, notes: n });
                                  } else {
                                    const p = [...(currentSlideDraft.points || [])];
                                    p[idx].desc = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, points: p });
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ================= SLIDE 4 ================= */}
                      {currentSlideIndex === 3 && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-400 font-medium block">
                            {isPibCampaign ? 'Backward Linkages (2-Col Badges)' : 'Procedural Traps Matrix'}
                          </label>
                          {isPibCampaign ? (
                            (currentSlideDraft.points || []).map((pt, pIdx) => (
                              <div key={pIdx} className="space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800">
                                <input
                                  type="text"
                                  value={pt.title}
                                  placeholder="e.g. Article 15(4)"
                                  onChange={(e) => {
                                    const pts = [...(currentSlideDraft.points || [])];
                                    pts[pIdx].title = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, points: pts });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={pt.desc}
                                  placeholder="Brief description"
                                  onChange={(e) => {
                                    const pts = [...(currentSlideDraft.points || [])];
                                    pts[pIdx].desc = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, points: pts });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                                />
                              </div>
                            ))
                          ) : (
                            (currentSlideDraft.rows || []).map((row, rIdx) => (
                              <div key={rIdx} className="space-y-1.5 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                                <input
                                  type="text"
                                  value={row.param}
                                  onChange={(e) => {
                                    const r = [...(currentSlideDraft.rows || [])];
                                    r[rIdx].param = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={row.rule}
                                  onChange={(e) => {
                                    const r = [...(currentSlideDraft.rows || [])];
                                    r[rIdx].rule = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sky-300 text-xs focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={row.trap}
                                  onChange={(e) => {
                                    const r = [...(currentSlideDraft.rows || [])];
                                    r[rIdx].trap = e.target.value;
                                    setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs focus:outline-none"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* ================= SLIDE 5 ================= */}
                      {currentSlideIndex === 4 && (
                        <div className="space-y-3">
                          {isPibCampaign ? (
                            <>
                              <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-1">
                                  Mains Analytical Question
                                </label>
                                <textarea
                                  rows={4}
                                  value={currentSlideDraft.mains_question || ''}
                                  onChange={(e) =>
                                    setCurrentSlideDraft({ ...currentSlideDraft, mains_question: e.target.value })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] text-slate-400 font-medium block">
                                  Prelims Rule vs. Trap Items
                                </label>
                                {(currentSlideDraft.rows || []).map((row, rIdx) => (
                                  <div key={rIdx} className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                                    <input
                                      type="text"
                                      value={row.param}
                                      onChange={(e) => {
                                        const r = [...(currentSlideDraft.rows || [])];
                                        r[rIdx].param = e.target.value;
                                        setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                      }}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={row.rule}
                                      onChange={(e) => {
                                        const r = [...(currentSlideDraft.rows || [])];
                                        r[rIdx].rule = e.target.value;
                                        setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                      }}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sky-300 text-xs focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={row.trap}
                                      onChange={(e) => {
                                        const r = [...(currentSlideDraft.rows || [])];
                                        r[rIdx].trap = e.target.value;
                                        setCurrentSlideDraft({ ...currentSlideDraft, rows: r });
                                      }}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs focus:outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-400 font-medium block">
                                Mains Dialectical Dimensions
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
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none"
                                  />
                                  <textarea
                                    rows={2}
                                    value={dim[1]}
                                    onChange={(e) => {
                                      const d = [...(currentSlideDraft.dimensions || [])];
                                      d[dIdx] = [d[dIdx][0], e.target.value];
                                      setCurrentSlideDraft({ ...currentSlideDraft, dimensions: d });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= SLIDE 6 ================= */}
                      {currentSlideIndex === 5 && (
                        <div className="space-y-3">
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
                              value={currentSlideDraft.telegram || 't.me/polity_mentor_ai'}
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
                              value={currentSlideDraft.instagram || '@politymentor_ai'}
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

              {/* Editable Social Post Caption Card */}
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
              Select a campaign from the queue to review and amend slides.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}