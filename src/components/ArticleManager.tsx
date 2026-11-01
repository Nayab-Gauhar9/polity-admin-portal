import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, RefreshCw, ScrollText, GitFork, AlertCircle, History } from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface ArticleSummary {
  id: number;
  article_number: string;
  article_slug: string;
  title: string;
  part_number: string;
  doctrine_cluster_id: string | null;
  has_comparative: boolean;
  traps_count: number;
}

interface ArticleDetail {
  id: number;
  article_number: string;
  article_slug: string;
  title: string;
  part_number: string;
  doctrine_cluster_id: string | null;
  verbatim_text: string;
  bare_act_analysis: any[];
  aspirant_summary: {
    core_mandate?: string;
    threshold_conditions?: string;
    prelims_traps?: string[];
  };
  evolution_trajectory: {
    colonial_genesis?: { source_statute?: string; historical_context?: string };
    cad_crucible?: { draft_article?: string; key_speakers?: string[]; pivotal_quote?: string };
    judicial_and_amendments?: Array<{ milestone: string; impact: string }>;
    contemporary_frictions?: string[];
  };
  comparative_matrix: {
    paired_article: string;
    rows: Array<{ parameter: string; primary: string; secondary: string }>;
  } | null;
}

export function ArticleManager() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await coreApiClient.get('/api/admin/articles', {
        params: { search: search || undefined, limit: 100 },
      });
      const items: ArticleSummary[] = res.data.articles || [];
      setArticles(items);
      if (items.length > 0 && !selectedId) {
        loadArticleDetail(items[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadArticleDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await coreApiClient.get(`/api/admin/articles/${id}`);
      setDetail(res.data.article);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search Article 356, Pardoning Power..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchArticles} 
          disabled={loading}
          className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Articles
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Article Roster */}
        <div className="lg:col-span-5">
          <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-3">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Constitutional Articles Index ({articles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[75vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900/80 sticky top-0">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 pl-4 py-2 text-xs">Provision</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs">Part</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs">Matrix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={3} className="text-center py-10 text-slate-500 text-xs">
                        {loading ? 'Querying provisions...' : 'No articles found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    articles.map((a) => (
                      <TableRow
                        key={a.id}
                        onClick={() => loadArticleDetail(a.id)}
                        className={`border-slate-800/60 cursor-pointer transition-colors ${
                          selectedId === a.id ? 'bg-indigo-950/40' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <TableCell className="pl-4 py-2.5">
                          <div className="font-semibold text-xs font-mono text-indigo-400">
                            {a.article_number}
                          </div>
                          <div className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                            {a.title}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className="text-[10px] bg-slate-800 border-slate-700 text-slate-300">
                            {a.part_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {a.has_comparative ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-950/40 border-emerald-700/60 text-emerald-400">
                              Paired
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Deep Inspector */}
        <div className="lg:col-span-7">
          <Card className="bg-slate-900 border-slate-800 shadow-sm sticky top-6">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-indigo-400" />
                    {detail ? `${detail.article_number}: ${detail.title}` : 'Select an Article'}
                  </CardTitle>
                  {detail && (
                    <CardDescription className="text-xs text-indigo-400 mt-1 font-mono">
                      {detail.part_number} {detail.doctrine_cluster_id ? `• Cluster: ${detail.doctrine_cluster_id}` : ''}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {detailLoading ? (
                <div className="text-center py-20 text-slate-500 text-xs">Loading deep analysis...</div>
              ) : detail ? (
                <>
                  {/* Verbatim Bare Act */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <ScrollText className="h-3.5 w-3.5 text-slate-400" /> Verbatim Constitutional Text
                    </h4>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70 text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap">
                      {detail.verbatim_text}
                    </div>
                  </div>

                  {/* Aspirant Traps & Mandate */}
                  {detail.aspirant_summary && (
                    <div className="p-3 rounded-lg border border-amber-900/40 bg-amber-950/20 space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Aspirant Core Mandate & Traps
                      </h4>
                      {detail.aspirant_summary.core_mandate && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          <span className="font-semibold text-slate-200">Mandate:</span> {detail.aspirant_summary.core_mandate}
                        </p>
                      )}
                      {detail.aspirant_summary.prelims_traps && detail.aspirant_summary.prelims_traps.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-semibold text-amber-300">Prelims Traps:</span>
                          <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-300">
                            {detail.aspirant_summary.prelims_traps.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4-Epoch Evolutionary Trajectory */}
                  {detail.evolution_trajectory && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-indigo-400" /> 4-Epoch Evolutionary Trajectory
                      </h4>
                      <div className="space-y-2">
                        {detail.evolution_trajectory.colonial_genesis && (
                          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs space-y-1">
                            <span className="text-[11px] font-semibold text-indigo-400">1. Colonial Genesis</span>
                            <p className="text-slate-300">{detail.evolution_trajectory.colonial_genesis.historical_context}</p>
                          </div>
                        )}
                        {detail.evolution_trajectory.cad_crucible && (
                          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs space-y-1">
                            <span className="text-[11px] font-semibold text-indigo-400">2. CAD Crucible</span>
                            <p className="text-slate-300 italic">"{detail.evolution_trajectory.cad_crucible.pivotal_quote}"</p>
                          </div>
                        )}
                        {detail.evolution_trajectory.judicial_and_amendments && (
                          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs space-y-1">
                            <span className="text-[11px] font-semibold text-indigo-400">3. Judicial Milestones</span>
                            <div className="space-y-1">
                              {detail.evolution_trajectory.judicial_and_amendments.map((m, idx) => (
                                <div key={idx} className="text-slate-300">
                                  • <span className="font-semibold text-slate-200">{m.milestone}:</span> {m.impact}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comparative Matrix */}
                  {detail.comparative_matrix && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                        <GitFork className="h-3.5 w-3.5 text-emerald-400" /> Comparison Matrix vs {detail.comparative_matrix.paired_article}
                      </h4>
                      <div className="rounded-lg border border-slate-800 overflow-hidden text-xs">
                        <table className="w-full">
                          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                            <tr>
                              <th className="p-2 text-left">Parameter</th>
                              <th className="p-2 text-left">{detail.article_number}</th>
                              <th className="p-2 text-left">{detail.comparative_matrix.paired_article}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                            {detail.comparative_matrix.rows.map((row, idx) => (
                              <tr key={idx}>
                                <td className="p-2 font-semibold text-slate-200">{row.parameter}</td>
                                <td className="p-2 text-slate-300">{row.primary}</td>
                                <td className="p-2 text-slate-400">{row.secondary}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-slate-500 text-xs">Select a provision to inspect.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}