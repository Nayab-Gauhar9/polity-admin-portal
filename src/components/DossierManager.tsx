import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, RefreshCw, GitBranch, ShieldCheck, Scale } from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface PerspectiveEdge {
  publication: string;
  event_date: string | null;
  perspective_stance: string;
  core_claim: string;
  legal_anchors: string[];
}

interface PrelimsFactsheet {
  constitutional_articles?: string[];
  statutory_acts_sections?: string[];
  nodal_body?: string;
  legal_status?: string;
  tenure_or_eligibility?: string;
  appointment_removal?: string;
  key_committees?: string[];
}

interface Dossier {
  id: string;
  title: string;
  issue_slug: string;
  chapter_name: string;
  status: string;
  article_count: number;
  canonical_summary: string | null;
  prelims_factsheet: PrelimsFactsheet;
  mains_framework: Record<string, any>;
  first_detected_at: string | null;
  last_updated_at: string | null;
  edges_count: number;
  perspectives: PerspectiveEdge[];
}

export function DossierManager() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDossiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await coreApiClient.get('/api/admin/dossiers', {
        params: { search: search || undefined, limit: 50 },
      });
      const data: Dossier[] = res.data.dossiers || [];
      setDossiers(data);
      if (data.length > 0 && !selectedDossier) {
        setSelectedDossier(data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Search & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search topic dossiers or chapter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDossiers()}
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDossiers}
          disabled={loading}
          className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Dossiers
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-950/40 border border-red-800/50 text-red-300">
          {error}
        </div>
      )}

      {/* Main Split: Dossiers List + Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Living Dossiers Table */}
        <div className="lg:col-span-6">
          <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-3">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                Living Constitutional Topic Graphs ({dossiers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[75vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900/80 sticky top-0">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 pl-4 py-2 text-xs">Topic Title & Chapter</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs">Sources</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dossiers.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={3} className="text-center py-12 text-slate-500 text-xs">
                        {loading ? 'Fetching dossiers from database...' : 'No dossiers found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    dossiers.map((d) => (
                      <TableRow
                        key={d.id}
                        onClick={() => setSelectedDossier(d)}
                        className={`border-slate-800/60 cursor-pointer transition-colors ${
                          selectedDossier?.id === d.id ? 'bg-indigo-950/40' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <TableCell className="pl-4 py-3">
                          <div className="font-semibold text-xs text-slate-200 line-clamp-1">
                            {d.title}
                          </div>
                          <div className="text-[11px] text-indigo-400 font-mono mt-0.5">
                            {d.chapter_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {d.issue_slug}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 text-[10px]">
                            {d.article_count} press
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={
                              d.status === 'active'
                                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400 text-[10px]'
                                : 'bg-slate-800 border-slate-700 text-slate-400 text-[10px]'
                            }
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Synthesis & Factsheet Inspector */}
        <div className="lg:col-span-6">
          <Card className="bg-slate-900 border-slate-800 shadow-sm sticky top-6">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-indigo-400" />
                    {selectedDossier ? selectedDossier.title : 'Select a Dossier'}
                  </CardTitle>
                  {selectedDossier && (
                    <CardDescription className="text-xs text-indigo-400 mt-1 font-mono">
                      {selectedDossier.chapter_name} · Updated {selectedDossier.last_updated_at ? new Date(selectedDossier.last_updated_at).toLocaleDateString() : '—'}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {selectedDossier ? (
                <>
                  {/* Canonical Synthesis Summary */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-400" /> Canonical Topic Synthesis
                    </h4>
                    <p className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 leading-relaxed font-serif">
                      {selectedDossier.canonical_summary || 'No canonical summary written yet.'}
                    </p>
                  </div>

                  {/* Prelims Master Factsheet */}
                  {selectedDossier.prelims_factsheet && Object.keys(selectedDossier.prelims_factsheet).length > 0 && (
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Prelims Master Factsheet
                      </h4>
                      {selectedDossier.prelims_factsheet.nodal_body && (
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold text-slate-400">Nodal Body:</span> {selectedDossier.prelims_factsheet.nodal_body}
                        </div>
                      )}
                      {selectedDossier.prelims_factsheet.legal_status && (
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold text-slate-400">Legal Status:</span> {selectedDossier.prelims_factsheet.legal_status}
                        </div>
                      )}
                      {selectedDossier.prelims_factsheet.constitutional_articles && selectedDossier.prelims_factsheet.constitutional_articles.length > 0 && (
                        <div className="text-xs text-slate-300 flex items-center gap-1 flex-wrap pt-1">
                          <span className="font-semibold text-slate-400">Provisions:</span>
                          {selectedDossier.prelims_factsheet.constitutional_articles.map((art, idx) => (
                            <Badge key={idx} variant="outline" className="bg-slate-800 border-slate-700 text-indigo-300 text-[10px]">
                              {art}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connected Evolutionary Perspective Edges */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-indigo-400" /> Synthesized Perspective Edges ({selectedDossier.perspectives.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedDossier.perspectives.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded border border-slate-800">
                          No viewpoint edges attached.
                        </p>
                      ) : (
                        selectedDossier.perspectives.map((edge, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/80 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-200 uppercase tracking-wide">
                                {edge.publication}
                              </span>
                              <Badge variant="outline" className="bg-indigo-950/50 border-indigo-700/60 text-indigo-300 text-[10px]">
                                {edge.perspective_stance}
                              </Badge>
                            </div>
                            <p className="text-slate-300 leading-relaxed">{edge.core_claim}</p>
                            {edge.legal_anchors && edge.legal_anchors.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-1">
                                {edge.legal_anchors.map((anc, aIdx) => (
                                  <span key={aIdx} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                    {anc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-500 text-xs">
                  Select a topic dossier to inspect its graph.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}