import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  ExternalLink,
  Layers,
  Clock
} from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface CampaignQueueItem {
  id: number;
  article_number: string;
  title: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | string;
  slides_payload: {
    slides: any[];
  };
  image_paths: string[];
  caption: string | null;
  created_at: string;
}

export function SocialManager() {
  const [queue, setQueue] = useState<CampaignQueueItem[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignQueueItem | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'ALL'>('PENDING_APPROVAL');
  
  // Generation state
  const [articleInput, setArticleInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Edit / Form state
  const [editablePayload, setEditablePayload] = useState<any>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await coreApiClient.get('/api/admin/social/queue', {
        params: { status_filter: statusFilter === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : undefined }
      });
      const items: CampaignQueueItem[] = res.data || [];
      setQueue(items);
      if (items.length > 0) {
        // Retain selection if still in queue, else pick first
        const match = items.find((c) => c.id === selectedCampaign?.id);
        selectCampaign(match || items[0]);
      } else {
        setSelectedCampaign(null);
        setEditablePayload(null);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.message || 'Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const selectCampaign = (camp: CampaignQueueItem) => {
    setSelectedCampaign(camp);
    setEditablePayload(JSON.parse(JSON.stringify(camp.slides_payload)));
    setCaptionInput(camp.caption || '');
    setCurrentSlideIndex(0);
    setActionSuccess(null);
    setActionError(null);
  };

  const handleGenerate = async () => {
    if (!articleInput.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await coreApiClient.post('/api/admin/social/generate', {
        article: articleInput.trim()
      });
      setArticleInput('');
      setActionSuccess(res.data.message || 'Draft created successfully!');
      await fetchQueue();
    } catch (err: any) {
      setGenerateError(err.response?.data?.detail || err.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAmendments = async () => {
    if (!selectedCampaign || !editablePayload) return;
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await coreApiClient.put(`/api/admin/social/queue/${selectedCampaign.id}/amend`, {
        slides_payload: editablePayload,
        caption: captionInput.trim() || null
      });

      const updatedPaths = res.data.image_paths || selectedCampaign.image_paths;
      const updatedCamp = {
        ...selectedCampaign,
        slides_payload: editablePayload,
        caption: captionInput.trim() || null,
        image_paths: updatedPaths
      };

      setSelectedCampaign(updatedCamp);
      setQueue((prev) => prev.map((c) => (c.id === updatedCamp.id ? updatedCamp : c)));
      setActionSuccess('Amendments saved & visual PNGs re-rendered dynamically!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.message || 'Failed to amend draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCampaign) return;
    setApproving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await coreApiClient.post(`/api/admin/social/queue/${selectedCampaign.id}/approve`);
      setActionSuccess(`Campaign #${selectedCampaign.id} approved for distribution!`);
      await fetchQueue();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const updateSlideField = (slideIdx: number, fieldKey: string, value: any) => {
    if (!editablePayload || !editablePayload.slides) return;
    const nextSlides = [...editablePayload.slides];
    nextSlides[slideIdx] = {
      ...nextSlides[slideIdx],
      [fieldKey]: value
    };
    setEditablePayload({ ...editablePayload, slides: nextSlides });
  };

  const updatePointField = (slideIdx: number, pointIdx: number, key: 'title' | 'desc', value: string) => {
    if (!editablePayload?.slides?.[slideIdx]?.points) return;
    const nextSlides = [...editablePayload.slides];
    const nextPoints = [...nextSlides[slideIdx].points];
    nextPoints[pointIdx] = { ...nextPoints[pointIdx], [key]: value };
    nextSlides[slideIdx] = { ...nextSlides[slideIdx], points: nextPoints };
    setEditablePayload({ ...editablePayload, slides: nextSlides });
  };

  const updateRowField = (slideIdx: number, rowIdx: number, key: 'param' | 'rule' | 'trap', value: string) => {
    if (!editablePayload?.slides?.[slideIdx]?.rows) return;
    const nextSlides = [...editablePayload.slides];
    const nextRows = [...nextSlides[slideIdx].rows];
    nextRows[rowIdx] = { ...nextRows[rowIdx], [key]: value };
    nextSlides[slideIdx] = { ...nextSlides[slideIdx], rows: nextRows };
    setEditablePayload({ ...editablePayload, slides: nextSlides });
  };

  const currentSlide = editablePayload?.slides?.[currentSlideIndex];
  const previewImage = selectedCampaign?.image_paths?.[currentSlideIndex];

  return (
    <div className="space-y-6">
      {/* Top Generator Bar */}
      <Card className="bg-slate-900 border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#A8997B]" />
                Programmatic Social Carousel Studio
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Generate 5-slide visual carousels with Groq gpt-oss-120b and review before publication.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Article # (e.g. 200, 356, 72)"
                  value={articleInput}
                  onChange={(e) => setArticleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  disabled={generating}
                  className="w-48 h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 font-mono"
                />
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating || !articleInput.trim()}
                  className="h-8 px-3 text-xs bg-[#A8997B] hover:bg-[#8f8267] text-slate-950 font-semibold transition"
                >
                  <Send className={`h-3.5 w-3.5 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Synthesizing...' : 'Generate Draft'}
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchQueue}
                disabled={loading}
                className="h-8 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {generateError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{generateError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Draft Queue List */}
        <div className="lg:col-span-4">
          <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#A8997B]" />
                Campaign Queue ({queue.length})
              </CardTitle>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStatusFilter('PENDING_APPROVAL')}
                  className={`text-[10px] px-2 py-0.5 rounded transition ${
                    statusFilter === 'PENDING_APPROVAL' 
                      ? 'bg-amber-950/70 border border-amber-800/80 text-amber-300 font-semibold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`text-[10px] px-2 py-0.5 rounded transition ${
                    statusFilter === 'ALL' 
                      ? 'bg-slate-800 text-slate-200 font-semibold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[75vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900/80 sticky top-0">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 pl-4 py-2 text-xs">Provision & Title</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs text-right pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={2} className="text-center py-10 text-slate-500 text-xs">
                        {loading ? 'Checking queue...' : 'No campaigns queued.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    queue.map((c) => {
                      const isSelected = selectedCampaign?.id === c.id;
                      return (
                        <TableRow
                          key={c.id}
                          onClick={() => selectCampaign(c)}
                          className={`border-slate-800/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <TableCell className="pl-4 py-3">
                            <div className="font-semibold text-xs font-mono text-[#A8997B]">
                              {c.article_number}
                            </div>
                            <div className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                              {c.title}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right pr-4">
                            <Badge
                              variant="outline"
                              className={
                                c.status === 'APPROVED'
                                  ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-400 text-[10px]'
                                  : 'border-amber-700/60 bg-amber-950/40 text-amber-300 text-[10px]'
                              }
                            >
                              {c.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Dual-Pane Studio (Visual Preview + In-Place Editor) */}
        <div className="lg:col-span-8">
          {selectedCampaign && editablePayload ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Carousel Visualizer */}
              <div className="xl:col-span-5 space-y-3">
                <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-lg">
                  <div className="relative aspect-[4/5] bg-slate-950 flex items-center justify-center border-b border-slate-800">
                    {previewImage ? (
                      <img
                        key={`${previewImage}?v=${selectedCampaign.created_at}`}
                        src={`${previewImage}?t=${Date.now()}`}
                        alt={`Slide ${currentSlideIndex + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Handle static local mount
                          (e.currentTarget as HTMLImageElement).src = previewImage;
                        }}
                      />
                    ) : (
                      <div className="text-slate-600 text-xs text-center p-6 font-mono">
                        No image rendered yet.
                      </div>
                    )}

                    <div className="absolute top-3 right-3 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-[#B99F9F] border border-slate-800">
                      Slide {currentSlideIndex + 1} / 5
                    </div>
                  </div>

                  <CardContent className="p-3 bg-slate-900/90 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                      disabled={currentSlideIndex === 0}
                      className="h-7 px-2 border-slate-800 bg-slate-950 text-slate-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all ${
                            currentSlideIndex === idx ? 'w-5 bg-[#A8997B]' : 'w-2 bg-slate-700 hover:bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentSlideIndex(Math.min(4, currentSlideIndex + 1))}
                      disabled={currentSlideIndex === 4}
                      className="h-7 px-2 border-slate-800 bg-slate-950 text-slate-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {previewImage && (
                  <div className="text-center">
                    <a
                      href={previewImage}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#A8997B] hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      <ExternalLink className="h-3 w-3" /> Open Full-Res PNG (1080x1350)
                    </a>
                  </div>
                )}
              </div>

              {/* In-Place Slide & Caption Editor */}
              <div className="xl:col-span-7">
                <Card className="bg-slate-900 border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-slate-800/80 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-100">
                          Editing Slide {currentSlideIndex + 1}: {currentSlide?.tier_badge || 'Content Form'}
                        </CardTitle>
                        <CardDescription className="text-xs text-[#B99F9F] font-mono mt-0.5">
                          {selectedCampaign.article_number}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveAmendments}
                          disabled={saving}
                          className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
                        >
                          <Save className={`h-3.5 w-3.5 mr-1 ${saving ? 'animate-spin' : ''}`} />
                          {saving ? 'Rendering...' : 'Save & Re-render'}
                        </Button>

                        {selectedCampaign.status !== 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={handleApprove}
                            disabled={approving}
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                          >
                            <Check className={`h-3.5 w-3.5 mr-1 ${approving ? 'animate-spin' : ''}`} />
                            {approving ? 'Approving...' : 'Approve'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
                    {/* SLIDE 1 FORM */}
                    {currentSlideIndex === 0 && currentSlide && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#A8997B]">Headline (H1)</label>
                          <Input
                            value={currentSlide.headline || ''}
                            onChange={(e) => updateSlideField(0, 'headline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#B99F9F]">Subheadline</label>
                          <Input
                            value={currentSlide.subheadline || ''}
                            onChange={(e) => updateSlideField(0, 'subheadline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400">Core Dialectical Thesis</label>
                          <Textarea
                            rows={3}
                            value={currentSlide.thesis || ''}
                            onChange={(e) => updateSlideField(0, 'thesis', e.target.value)}
                            className="text-xs bg-slate-950 border-slate-800 text-slate-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* SLIDE 2 FORM: CAD CRUCIBLE */}
                    {currentSlideIndex === 1 && currentSlide && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#A8997B]">Slide Title</label>
                          <Input
                            value={currentSlide.headline || ''}
                            onChange={(e) => updateSlideField(1, 'headline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#B99F9F]">Colonial Statute Context</label>
                          <Textarea
                            rows={2}
                            value={currentSlide.colonial_context || ''}
                            onChange={(e) => updateSlideField(1, 'colonial_context', e.target.value)}
                            className="text-xs bg-slate-950 border-slate-800 text-slate-200"
                          />
                        </div>
                        <div className="space-y-1 p-2.5 rounded bg-slate-950 border border-slate-800">
                          <label className="text-[11px] font-semibold text-[#B99F9F]">Constituent Assembly Quote</label>
                          <Textarea
                            rows={3}
                            value={currentSlide.cad_quote || ''}
                            onChange={(e) => updateSlideField(1, 'cad_quote', e.target.value)}
                            className="text-xs bg-slate-900 border-slate-800 text-slate-200 italic mt-1"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-slate-400">Speaker:</span>
                            <Input
                              value={currentSlide.cad_speaker || 'Dr. B.R. Ambedkar'}
                              onChange={(e) => updateSlideField(1, 'cad_speaker', e.target.value)}
                              className="h-7 text-xs bg-slate-900 border-slate-800 text-[#A8997B] font-semibold w-48"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#A8997B]">The Jurisprudential Paradox</label>
                          <Textarea
                            rows={2}
                            value={currentSlide.analytical_insight || ''}
                            onChange={(e) => updateSlideField(1, 'analytical_insight', e.target.value)}
                            className="text-xs bg-slate-950 border-slate-800 text-slate-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* SLIDE 3 FORM: LANDMARK PRECEDENT */}
                    {currentSlideIndex === 2 && currentSlide && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#A8997B]">Landmark Case Headline</label>
                          <Input
                            value={currentSlide.headline || ''}
                            onChange={(e) => updateSlideField(2, 'headline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#B99F9F]">Doctrinal Subtitle</label>
                          <Input
                            value={currentSlide.subheadline || ''}
                            onChange={(e) => updateSlideField(2, 'subheadline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100"
                          />
                        </div>
                        <div className="space-y-2.5 pt-1">
                          {currentSlide.points?.map((p: any, pIdx: number) => (
                            <div key={pIdx} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                              <Input
                                value={p.title || ''}
                                onChange={(e) => updatePointField(2, pIdx, 'title', e.target.value)}
                                className="h-7 text-xs bg-slate-900 border-slate-800 text-[#A8997B] font-semibold"
                              />
                              <Textarea
                                rows={2}
                                value={p.desc || ''}
                                onChange={(e) => updatePointField(2, pIdx, 'desc', e.target.value)}
                                className="text-xs bg-slate-900 border-slate-800 text-slate-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SLIDE 4 FORM: PARAMETERS & TRAPS */}
                    {currentSlideIndex === 3 && currentSlide && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#A8997B]">Slide Headline</label>
                          <Input
                            value={currentSlide.headline || ''}
                            onChange={(e) => updateSlideField(3, 'headline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 font-bold"
                          />
                        </div>
                        <div className="space-y-2.5">
                          {currentSlide.rows?.map((r: any, rIdx: number) => (
                            <div key={rIdx} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                              <Input
                                value={r.param || ''}
                                onChange={(e) => updateRowField(3, rIdx, 'param', e.target.value)}
                                className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-100 font-semibold"
                              />
                              <Input
                                placeholder="Rule..."
                                value={r.rule || ''}
                                onChange={(e) => updateRowField(3, rIdx, 'rule', e.target.value)}
                                className="h-7 text-xs bg-slate-900 border-slate-800 text-[#38BDF8]"
                              />
                              <Input
                                placeholder="Trap..."
                                value={r.trap || ''}
                                onChange={(e) => updateRowField(3, rIdx, 'trap', e.target.value)}
                                className="h-7 text-xs bg-slate-900 border-slate-800 text-[#F59E0B]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SLIDE 5 FORM: MAINS BLUEPRINT */}
                    {currentSlideIndex === 4 && currentSlide && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#A8997B]">Slide Headline</label>
                          <Input
                            value={currentSlide.headline || ''}
                            onChange={(e) => updateSlideField(4, 'headline', e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 font-bold"
                          />
                        </div>
                        <div className="space-y-2.5">
                          {currentSlide.dimensions?.map((dim: any[], dIdx: number) => (
                            <div key={dIdx} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                              <Input
                                value={dim[0] || ''}
                                onChange={(e) => {
                                  const nextDims = [...currentSlide.dimensions];
                                  nextDims[dIdx] = [e.target.value, nextDims[dIdx][1]];
                                  updateSlideField(4, 'dimensions', nextDims);
                                }}
                                className="h-7 text-xs bg-slate-900 border-slate-800 text-[#A8997B] font-semibold"
                              />
                              <Textarea
                                rows={2}
                                value={dim[1] || ''}
                                onChange={(e) => {
                                  const nextDims = [...currentSlide.dimensions];
                                  nextDims[dIdx] = [nextDims[dIdx][0], e.target.value];
                                  updateSlideField(4, 'dimensions', nextDims);
                                }}
                                className="text-xs bg-slate-900 border-slate-800 text-slate-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SOCIAL CAPTION & HASHTAGS */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">Social Post Caption</label>
                      <Textarea
                        rows={3}
                        value={captionInput}
                        onChange={(e) => setCaptionInput(e.target.value)}
                        className="text-xs bg-slate-950 border-slate-800 text-slate-200 leading-relaxed font-mono"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="bg-slate-900 border-slate-800 shadow-sm">
              <CardContent className="py-24 text-center text-slate-500 text-xs">
                Select an article campaign from the queue to preview slides and amend content.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}