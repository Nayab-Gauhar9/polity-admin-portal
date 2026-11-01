import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, RefreshCw, Bot, HelpCircle, XCircle } from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface ContentReportItem {
  id: number;
  type: string;
  firebase_uid: string;
  issue_category: string;
  source_page: string;
  flagged_content: string | null;
  user_feedback: string;
  status: string;
  created_at: string | null;
}

interface QuestionReportItem {
  id: string;
  type: string;
  user_id: string;
  drill_date: string | null;
  question_index: number;
  question_text: string;
  issue_type: string;
  user_notes: string | null;
  status: string;
  created_at: string | null;
}

interface Metrics {
  pending_content_reports: number;
  pending_question_reports: number;
  total_pending: number;
}

export function ReportManager() {
  const [contentReports, setContentReports] = useState<ContentReportItem[]>([]);
  const [questionReports, setQuestionReports] = useState<QuestionReportItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    pending_content_reports: 0,
    pending_question_reports: 0,
    total_pending: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await coreApiClient.get('/api/admin/reports', {
        params: { status_filter: filter },
      });
      setContentReports(res.data.content_reports || []);
      setQuestionReports(res.data.question_reports || []);
      setMetrics(res.data.metrics || {
        pending_content_reports: 0,
        pending_question_reports: 0,
        total_pending: 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const updateContentReport = async (id: number, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await coreApiClient.patch(`/api/admin/reports/content/${id}`, { status });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  const updateQuestionReport = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await coreApiClient.patch(`/api/admin/reports/question/${id}`, { status });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Pending Review Items</p>
              <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{metrics.total_pending}</h3>
            </div>
            <div className="p-3 bg-amber-950/60 border border-amber-800/40 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">AI Hallucination Reports</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">{metrics.pending_content_reports}</h3>
            </div>
            <div className="p-3 bg-indigo-950/60 border border-indigo-800/40 rounded-xl">
              <Bot className="h-6 w-6 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Drill Key & Option Flags</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">{metrics.pending_question_reports}</h3>
            </div>
            <div className="p-3 bg-rose-950/60 border border-rose-800/40 rounded-xl">
              <HelpCircle className="h-6 w-6 text-rose-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Panel */}
      <Tabs defaultValue="content_reports" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger 
              value="content_reports" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Bot className="h-4 w-4 mr-2" />
              AI Content Inaccuracies ({contentReports.length})
            </TabsTrigger>
            <TabsTrigger 
              value="question_reports" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Daily Drill MCQ Flags ({questionReports.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter(filter === 'PENDING' ? 'ALL' : 'PENDING')}
              className="border-slate-800 bg-slate-900 text-xs text-slate-300"
            >
              View: {filter === 'PENDING' ? 'Pending Only' : 'All History'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              className="border-slate-800 bg-slate-900 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab 1: AI Content & Hallucinations */}
        <TabsContent value="content_reports">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-400" />
                AI Model & Living Dossier Accuracy Reports
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Feedback reported by students across ChatbotPM, dossiers, and bare act analyses.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 pl-4">Source Page</TableHead>
                    <TableHead className="text-slate-400">Category</TableHead>
                    <TableHead className="text-slate-400">Flagged Passage & User Feedback</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentReports.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                        {loading ? 'Checking for reports...' : 'No reports found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    contentReports.map((item) => (
                      <TableRow key={item.id} className="border-slate-800/60 hover:bg-slate-800/30">
                        <TableCell className="pl-4 py-3 font-mono text-xs text-indigo-400">
                          {item.source_page}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-amber-700/60 bg-amber-950/40 text-amber-300 text-[11px]">
                            {item.issue_category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-xs font-semibold text-slate-200">
                            {item.user_feedback}
                          </div>
                          {item.flagged_content && (
                            <div className="text-xs text-slate-400 font-mono mt-1 p-2 rounded bg-slate-950 border border-slate-800 line-clamp-2">
                              "{item.flagged_content}"
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={item.status === 'PENDING' ? 'bg-amber-950/50 text-amber-400' : 'bg-emerald-950/50 text-emerald-400'}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          {item.status === 'PENDING' ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateContentReport(item.id, 'RESOLVED')}
                                className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateContentReport(item.id, 'DISMISSED')}
                                className="h-8 px-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Dismiss
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: MCQ & Daily Drill Reports */}
        <TabsContent value="question_reports">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-rose-400" />
                MCQ Answer Key & Trap Disputes
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Flags on 15-question daily Prelims challenges submitted by test-takers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 pl-4">Drill Date / Q#</TableHead>
                    <TableHead className="text-slate-400">Issue Type</TableHead>
                    <TableHead className="text-slate-400">Student Explanation & Question</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionReports.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                        {loading ? 'Checking for MCQ reports...' : 'No question flags found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    questionReports.map((q) => (
                      <TableRow key={q.id} className="border-slate-800/60 hover:bg-slate-800/30">
                        <TableCell className="pl-4 py-3">
                          <div className="font-semibold text-xs text-slate-200">
                            {q.drill_date || 'Static Drill'}
                          </div>
                          <div className="text-xs font-mono text-indigo-400">
                            Question #{q.question_index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-rose-700/60 bg-rose-950/40 text-rose-300 text-[11px]">
                            {q.issue_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-xs font-semibold text-slate-200">
                            {q.user_notes || 'No description provided.'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1 p-2 rounded bg-slate-950 border border-slate-800 line-clamp-2">
                            {q.question_text}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={q.status === 'PENDING' ? 'bg-amber-950/50 text-amber-400' : 'bg-emerald-950/50 text-emerald-400'}
                          >
                            {q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          {q.status === 'PENDING' ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateQuestionReport(q.id, 'RESOLVED')}
                                className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateQuestionReport(q.id, 'DISMISSED')}
                                className="h-8 px-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Dismiss
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
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