import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import { Database, CheckCircle2, AlertTriangle } from 'lucide-react';

export function CacheManager() {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const purgeCache = async (tag: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.post(`//purge-cache?tag=${encodeURIComponent(tag)}`);
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                Upstash Redis & Edge Cache Control
              </CardTitle>
              <CardDescription>
                Flush distributed cache keys across syllabus, PYQ, and living dossier pipelines.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-semibold text-sm">Blueprint & Syllabus</h4>
              <p className="text-xs text-slate-500">Purges Prelims & Mains overview decoders.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => purgeCache('blueprint')}
                disabled={loading}
              >
                Flush Blueprint
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-semibold text-sm">Articles & Bare Act</h4>
              <p className="text-xs text-slate-500">Purges constitutional article cache tiers.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => purgeCache('articles')}
                disabled={loading}
              >
                Flush Articles
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-semibold text-sm">PYQ Bank</h4>
              <p className="text-xs text-slate-500">Purges chapter-wise and trend metrics.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => purgeCache('pyqs')}
                disabled={loading}
              >
                Flush PYQs
              </Button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
              isError 
                ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'

                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
            }`}>
              {isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{statusMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
