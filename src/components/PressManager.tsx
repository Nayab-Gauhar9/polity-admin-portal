import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Newspaper, RefreshCw, CheckCircle2, AlertOctagon, Layers, Binary, Clock } from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface IngestionFailures {
  collection: number;
  validation: number;
  storage: number;
  unexpected: number;
}

interface IngestionRunItem {
  run_id: string;
  source: string;
  started_at: string | null;
  completed_at: string | null;
  total_items: number;
  collected: number;
  valid: number;
  uploaded: number;
  already_exists: number;
  failed: number;
  failures: IngestionFailures;
}

interface VectorChunkItem {
  id: number;
  prid: string;
  chapter_name: string;
  topic: string;
  chunk_type: string;
  chunk_text: string;
  token_count: number | null;
  embedding_model: string;
  has_embedding: boolean;
}

export function PressManager() {
  const [runs, setRuns] = useState<IngestionRunItem[]>([]);
  const [chunks, setChunks] = useState<VectorChunkItem[]>([]);
  const [metrics, setMetrics] = useState({
    total_valid_articles: 0,
    total_failures: 0,
    total_vector_chunks: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchETLData = async () => {
    setLoading(true);
    try {
      const [runsRes, chunksRes] = await Promise.all([
        coreApiClient.get('/api/admin/ingestion-runs?limit=40'),
        coreApiClient.get('/api/admin/ingestion-chunks?limit=30'),
      ]);
      setRuns(runsRes.data.runs || []);
      setMetrics(runsRes.data.metrics || {
        total_valid_articles: 0,
        total_failures: 0,
        total_vector_chunks: 0,
      });
      setChunks(chunksRes.data.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchETLData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Status Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Synthesized Valid Articles</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">{metrics.total_valid_articles}</h3>
            </div>
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/40 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Vector Document Chunks</p>
              <h3 className="text-3xl font-extrabold text-indigo-400 mt-1">{metrics.total_vector_chunks}</h3>
            </div>
            <div className="p-3 bg-indigo-950/60 border border-indigo-800/40 rounded-xl">
              <Binary className="h-6 w-6 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Pipeline Failures</p>
              <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{metrics.total_failures}</h3>
            </div>
            <div className="p-3 bg-rose-950/60 border border-rose-800/40 rounded-xl">
              <AlertOctagon className="h-6 w-6 text-rose-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="runs" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Newspaper className="h-4 w-4 mr-2" /> Ingestion Runs ({runs.length})
            </TabsTrigger>
            <TabsTrigger value="chunks" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Layers className="h-4 w-4 mr-2" /> pgvector Embeddings ({chunks.length})
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchETLData}
            disabled={loading}
            className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Pipeline
          </Button>
        </div>

        {/* Tab 1: Execution Runs */}
        <TabsContent value="runs">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-indigo-400" />
                Press Ingestion Execution Ledger
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                History of automated runs across PIB, The Hindu, Live Law, and Bar and Bench.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 pl-4">Source & Run ID</TableHead>
                    <TableHead className="text-slate-400">Timing</TableHead>
                    <TableHead className="text-slate-400">Processed</TableHead>
                    <TableHead className="text-slate-400">Valid / Uploaded</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 pr-4">Failures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                        {loading ? 'Checking ingestion ledger...' : 'No runs recorded.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((r) => {
                      const hasFailures = r.failed > 0;
                      return (
                        <TableRow key={r.run_id} className="border-slate-800/60 hover:bg-slate-800/30">
                          <TableCell className="pl-4 py-3">
                            <div className="font-semibold text-xs text-slate-200 uppercase tracking-wide">
                              {r.source}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {r.run_id.slice(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            <div className="flex items-center gap-1 text-slate-300">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {r.started_at ? new Date(r.started_at).toLocaleTimeString() : '—'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {r.started_at ? new Date(r.started_at).toLocaleDateString() : ''}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300 font-mono">
                            {r.collected} / {r.total_items}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-950/40 border-emerald-700/60 text-emerald-400 text-xs">
                              {r.valid} valid · {r.uploaded} up
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={hasFailures ? 'bg-rose-950/50 border-rose-700/60 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-300'}
                            >
                              {hasFailures ? 'FAILURES DETECTED' : 'HEALTHY'}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-4 text-xs font-mono">
                            {hasFailures ? (
                              <span className="text-rose-400">
                                {r.failed} err (V:{r.failures.validation} S:{r.failures.storage})
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Vector Chunks & Embeddings */}
        <TabsContent value="chunks">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Binary className="h-5 w-5 text-indigo-400" />
                Recent pgvector Semantic Chunks
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                1024-dimension Qwen embeddings embedded into PostgreSQL for RAG generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 pl-4">Chunk ID & PRID</TableHead>
                    <TableHead className="text-slate-400">Taxonomy & Topic</TableHead>
                    <TableHead className="text-slate-400">Passage Text</TableHead>
                    <TableHead className="text-slate-400">Model / Tokens</TableHead>
                    <TableHead className="text-slate-400 pr-4">Vector Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chunks.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                        {loading ? 'Reading chunks from pgvector...' : 'No chunks recorded.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    chunks.map((c) => (
                      <TableRow key={c.id} className="border-slate-800/60 hover:bg-slate-800/30">
                        <TableCell className="pl-4 py-3 font-mono text-xs">
                          <span className="text-indigo-400 font-semibold">#{c.id}</span>
                          <div className="text-slate-500 text-[11px]">{c.prid}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-slate-200">{c.chapter_name}</div>
                          <div className="text-slate-400 text-[11px]">{c.topic}</div>
                        </TableCell>
                        <TableCell className="max-w-md py-3">
                          <p className="text-xs text-slate-300 font-serif leading-relaxed line-clamp-2">
                            "{c.chunk_text}"
                          </p>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-400">
                          <div>{c.embedding_model}</div>
                          <div className="text-[10px] text-slate-500">{c.token_count || 0} tokens</div>
                        </TableCell>
                        <TableCell className="pr-4">
                          <Badge variant="outline" className="bg-indigo-950/40 border-indigo-700/60 text-indigo-300 text-xs">
                            1024-d Vector
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}