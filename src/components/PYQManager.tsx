import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, Search, RefreshCw, CheckCircle2, BookOpen, Tag, HelpCircle } from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface PYQItem {
  id: number;
  year: number;
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_option: string;
  chapter_number: number;
  chapter_name: string;
  mapped_articles: number[];
  explanation: string | null;
  difficulty_level: string | null;
  is_conceptual: boolean;
}

export function PYQManager() {
  const [pyqs, setPyqs] = useState<PYQItem[]>([]);
  const [selectedPyq, setSelectedPyq] = useState<PYQItem | null>(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [newArticleInput, setNewArticleInput] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPYQs = async () => {
    setLoading(true);
    try {
      const res = await coreApiClient.get('/api/admin/pyqs', {
        params: {
          search: search || undefined,
          year: yearFilter ? parseInt(yearFilter) : undefined,
          limit: 100,
        },
      });
      const items: PYQItem[] = res.data.pyqs || [];
      setPyqs(items);
      if (items.length > 0 && !selectedPyq) {
        setSelectedPyq(items[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddArticle = async () => {
    if (!selectedPyq || !newArticleInput.trim()) return;
    const artNum = parseInt(newArticleInput.trim());
    if (isNaN(artNum)) return;

    const updatedArticles = Array.from(new Set([...selectedPyq.mapped_articles, artNum]));
    try {
      await coreApiClient.patch(`/api/admin/pyqs/${selectedPyq.id}`, {
        mapped_articles: updatedArticles,
      });
      setSelectedPyq({ ...selectedPyq, mapped_articles: updatedArticles });
      setPyqs(pyqs.map((p) => (p.id === selectedPyq.id ? { ...p, mapped_articles: updatedArticles } : p)));
      setNewArticleInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveArticle = async (artNum: number) => {
    if (!selectedPyq) return;
    const updatedArticles = selectedPyq.mapped_articles.filter((a) => a !== artNum);
    try {
      await coreApiClient.patch(`/api/admin/pyqs/${selectedPyq.id}`, {
        mapped_articles: updatedArticles,
      });
      setSelectedPyq({ ...selectedPyq, mapped_articles: updatedArticles });
      setPyqs(pyqs.map((p) => (p.id === selectedPyq.id ? { ...p, mapped_articles: updatedArticles } : p)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPYQs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search PYQ text, key terms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPYQs()}
              className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <Input
            placeholder="Year (e.g. 2024)"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPYQs()}
            className="w-32 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPYQs}
          disabled={loading}
          className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Query Question Bank
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Question List */}
        <div className="lg:col-span-6">
          <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-3">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                UPSC Prelims Archive ({pyqs.length} Loaded)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[75vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900/80 sticky top-0">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 pl-4 py-2 text-xs">Year / Q#</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs">Question Snippet</TableHead>
                    <TableHead className="text-slate-400 py-2 text-xs">Key</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pyqs.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={3} className="text-center py-10 text-slate-500 text-xs">
                        {loading ? 'Fetching PYQs...' : 'No historical questions matched.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pyqs.map((q) => (
                      <TableRow
                        key={q.id}
                        onClick={() => setSelectedPyq(q)}
                        className={`border-slate-800/60 cursor-pointer transition-colors ${
                          selectedPyq?.id === q.id ? 'bg-indigo-950/40' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <TableCell className="pl-4 py-3 font-mono text-xs text-indigo-400 font-semibold whitespace-nowrap">
                          {q.year} · Q{q.question_number}
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {q.question_text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 font-medium">Ch.{q.chapter_number} {q.chapter_name}</span>
                            {q.mapped_articles.length > 0 && (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                {q.mapped_articles.length} Art.
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 pr-4">
                          <Badge className="bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold text-xs">
                            {q.correct_option}
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

        {/* Right Side: Deep MCQ Inspector */}
        <div className="lg:col-span-6">
          <Card className="bg-slate-900 border-slate-800 shadow-sm sticky top-6">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-400" />
                    Prelims {selectedPyq?.year} · Question #{selectedPyq?.question_number}
                  </CardTitle>
                  {selectedPyq && (
                    <CardDescription className="text-xs text-indigo-400 mt-1">
                      Chapter {selectedPyq.chapter_number}: {selectedPyq.chapter_name}
                    </CardDescription>
                  )}
                </div>
                {selectedPyq && (
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                    {selectedPyq.difficulty_level || 'Standard'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {selectedPyq ? (
                <>
                  {/* Question Stem */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Official Question Text</h4>
                    <p className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 leading-relaxed font-serif">
                      {selectedPyq.question_text}
                    </p>
                  </div>

                  {/* Options List */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Options</h4>
                    <div className="space-y-1.5">
                      {Object.entries(selectedPyq.options || {}).map(([key, val]) => {
                        const isCorrect = key.toUpperCase() === selectedPyq.correct_option.toUpperCase();
                        return (
                          <div
                            key={key}
                            className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                              isCorrect
                                ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                                : 'bg-slate-950/50 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              ({key})
                            </span>
                            <span className="flex-1 leading-relaxed">{val}</span>
                            {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Constitutional Article Mapping Array */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-indigo-400" /> Mapped Constitutional Provisions
                    </h4>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/70 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPyq.mapped_articles.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No articles mapped yet.</span>
                        ) : (
                          selectedPyq.mapped_articles.map((art) => (
                            <Badge
                              key={art}
                              variant="outline"
                              className="bg-indigo-950/40 border-indigo-700/60 text-indigo-300 text-xs py-1 px-2 flex items-center gap-1"
                            >
                              <BookOpen className="h-3 w-3" /> Art. {art}
                              <button
                                onClick={() => handleRemoveArticle(art)}
                                className="ml-1 text-slate-400 hover:text-rose-400 font-bold"
                              >
                                ×
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                        <Input
                          placeholder="Add Article (e.g. 356)"
                          value={newArticleInput}
                          onChange={(e) => setNewArticleInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddArticle()}
                          className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 w-44"
                        />
                        <Button size="sm" onClick={handleAddArticle} className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500">
                          Map Article
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Model Explanation */}
                  {selectedPyq.explanation && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Explanatory Breakdown</h4>
                      <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedPyq.explanation}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-slate-500 text-xs">Select a question to inspect.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}