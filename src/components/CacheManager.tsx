import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { coreApiClient } from '@/lib/api';
import { Database, CheckCircle2, AlertTriangle, Layers, BookOpen, FileText } from 'lucide-react';

export function CacheManager() {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const purgeCache = async (tag: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await coreApiClient.post(`/api/admin/purge-cache?tag=${encodeURIComponent(tag)}`);
      setIsError(false);
      setStatusMessage(`Purged tag "${tag}": ${JSON.stringify(res.data)}`);
    } catch (err: any) {
      setIsError(true);
      const detail = err.response?.data?.detail || err.message;
      setStatusMessage(`Purge failed: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-100">
                <Database className="h-5 w-5 text-indigo-400" />
                Upstash Redis & Edge Cache Control
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Flush distributed cache keys across syllabus, PYQ, articles, and living dossier pipelines.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-700/60 text-emerald-400 bg-emerald-950/40 text-xs">
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Blueprint & Syllabus */}
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <Layers className="h-4 w-4" />
                <h4 className="font-semibold text-sm text-slate-200">Blueprint & Syllabus</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Purges Prelims & Mains overview decoders and syllabus maps.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white mt-2"
                onClick={() => purgeCache('blueprint')}
                disabled={loading}
              >
                Flush Blueprint
              </Button>
            </div>

            {/* 2. Articles & Bare Act */}
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <BookOpen className="h-4 w-4" />
                <h4 className="font-semibold text-sm text-slate-200">Articles & Bare Act</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Purges constitutional article catalogue, detail views, and matrix caches.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white mt-2"
                onClick={() => purgeCache('articles')}
                disabled={loading}
              >
                Flush Articles
              </Button>
            </div>

            {/* 3. PYQ Bank */}
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <Database className="h-4 w-4" />
                <h4 className="font-semibold text-sm text-slate-200">Prelims PYQ Bank</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Purges chapter-wise question lists, topic filters, and trend metrics.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white mt-2"
                onClick={() => purgeCache('pyqs')}
                disabled={loading}
              >
                Flush PYQs
              </Button>
            </div>

            {/* 4. Living Dossiers & Sitemap */}
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <FileText className="h-4 w-4" />
                <h4 className="font-semibold text-sm text-slate-200">Living Dossiers & SEO</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Purges living issue graphs, news timelines, and sitemap XML.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white mt-2"
                onClick={() => purgeCache('dossiers')}
                disabled={loading}
              >
                Flush Dossiers
              </Button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              isError 
                ? 'bg-rose-950/40 border-rose-800/50 text-rose-300' 
                : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            }`}>
              {isError ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span className="font-mono">{statusMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}