import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  BarChart3, 
  RefreshCw, 
  Copy, 
  Check, 
  MousePointerClick, 
  ShieldCheck, 
  Calendar, 
  Globe, 
  Send, 
  Video, 
  Camera 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface CampaignMetric {
  total_real_clicks: number;
  today_real_clicks: number;
  bot_scrapes: number;
  last_click_utc: string;
}

interface CampaignStatsResponse {
  status: string;
  analytics: Record<string, CampaignMetric>;
}

const CAMPAIGN_METADATA: Record<string, { label: string; channel: 'telegram' | 'instagram' | 'youtube'; destination: string }> = {
  'tg-toppers': {
    label: 'Toppers Notes Sponsored Channel (1/24 Slot)',
    channel: 'telegram',
    destination: 'https://politymentor.com/?utm_source=telegram&utm_medium=sponsored_channel&utm_campaign=toppers_notes_nov12',
  },
  'tg-notes': {
    label: 'GS-II Notes Channel Cross-Promo',
    channel: 'telegram',
    destination: 'https://politymentor.com/?utm_source=telegram&utm_medium=sponsored_post&utm_campaign=gs2_notes',
  },
  'ig-art127': {
    label: 'Article 127 Carousel / Ad Link',
    channel: 'instagram',
    destination: 'https://politymentor.com/?utm_source=instagram&utm_medium=carousel&utm_campaign=art127_pib',
  },
  'ig-bio': {
    label: 'Instagram Bio Link Tree',
    channel: 'instagram',
    destination: 'https://politymentor.com/?utm_source=instagram&utm_medium=bio&utm_campaign=main_profile',
  },
  'yt-art3': {
    label: 'Article 3 Masterclass Pinned / Description',
    channel: 'youtube',
    destination: 'https://politymentor.com/?utm_source=youtube&utm_medium=video_desc&utm_campaign=art3_masterclass',
  },
};

/**
 * Converts UTC ISO string to Indian Standard Time (IST)
 * Example: 2026-11-11T19:06:06 -> 12 Nov, 12:36:06 AM
 */
function formatToIST(utcString: string | null | undefined): string {
  if (!utcString || utcString === 'None') return '—';

  const normalized = utcString.endsWith('Z') ? utcString : `${utcString}Z`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function CampaignManager() {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const { data, isError, error, refetch, isFetching } = useQuery<CampaignStatsResponse>({
    queryKey: ['campaignLiveStats'],
    queryFn: async () => {
      // Prioritizes VITE_API_BASE_URL (points to newspaper-upsc-ai.onrender.com)
      const base = 
        import.meta.env.VITE_API_BASE_URL || 
        'https://newspaper-upsc-ai.onrender.com';

      const res = await axios.get(`${base.replace(/\/$/, '')}/r/stats/live`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const analytics = data?.analytics || {};

  const totals = useMemo(() => {
    let today = 0;
    let lifetime = 0;
    let bots = 0;

    Object.values(analytics).forEach((m) => {
      today += m.today_real_clicks || 0;
      lifetime += m.total_real_clicks || 0;
      bots += m.bot_scrapes || 0;
    });

    return { today, lifetime, bots };
  }, [analytics]);

  const copyLink = (tag: string) => {
    const link = `https://politymentor.com/r/${tag}`;
    navigator.clipboard.writeText(link);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'telegram':
        return <Send className="h-4 w-4 text-sky-400" />;
      case 'instagram':
        return <Camera className="h-4 w-4 text-pink-400" />;
      case 'youtube':
        return <Video className="h-4 w-4 text-rose-500" />;
      default:
        return <Globe className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-bold text-slate-100">Live Campaign Telemetry & Ingress</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time unauthenticated visitor tracking powered by Upstash Redis and Cloudflare edge redirection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-950/40 text-emerald-400 border-emerald-800/60 text-xs py-1 px-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />
            Live Polling (10s)
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg">
          Failed to load live telemetry: {(error as any)?.message}
        </div>
      )}

      {/* Aggregate Stat Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Ingress Hits</p>
              <h3 className="text-3xl font-bold mt-1 text-sky-400">{totals.today}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Direct human clicks today</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-800/50">
              <Calendar className="h-6 w-6 text-sky-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Verified Visits</p>
              <h3 className="text-3xl font-bold mt-1 text-emerald-400">{totals.lifetime}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Total unauthenticated arrivals</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50">
              <MousePointerClick className="h-6 w-6 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bot & Crawler Scrapes</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-300">{totals.bots}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Filtered Telegram/Meta spiders</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <ShieldCheck className="h-6 w-6 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Breakdown Table */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
            Active Campaign Distribution Links
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Share these exact branded links. Each tap is logged in Redis before issuing an instantaneous 302 redirect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-xs text-slate-400">Channel & Description</TableHead>
                  <TableHead className="text-xs text-slate-400">Campaign Link</TableHead>
                  <TableHead className="text-xs text-slate-400 text-center">Today</TableHead>
                  <TableHead className="text-xs text-slate-400 text-center">Lifetime</TableHead>
                  <TableHead className="text-xs text-slate-400 text-center">Bots</TableHead>
                  <TableHead className="text-xs text-slate-400">Last Click (IST)</TableHead>
                  <TableHead className="text-xs text-slate-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(CAMPAIGN_METADATA).map(([tag, meta]) => {
                  const metric = analytics[tag] || {
                    total_real_clicks: 0,
                    today_real_clicks: 0,
                    bot_scrapes: 0,
                    last_click_utc: 'None',
                  };

                  const cleanLastClickIST = formatToIST(metric.last_click_utc);
                  const shortUrl = `politymentor.com/r/${tag}`;

                  return (
                    <TableRow key={tag} className="border-slate-800/70 hover:bg-slate-900/40">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(meta.channel)}
                          <span className="font-semibold text-xs text-slate-200">{meta.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-sm font-mono mt-0.5">
                          {meta.destination}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-xs text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded">
                          {shortUrl}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-bold text-xs text-sky-400">
                        {metric.today_real_clicks}
                      </TableCell>

                      <TableCell className="text-center font-bold text-xs text-slate-100">
                        {metric.total_real_clicks}
                      </TableCell>

                      <TableCell className="text-center text-xs text-slate-500 font-mono">
                        {metric.bot_scrapes}
                      </TableCell>

                      <TableCell className="text-xs text-slate-300 font-mono">
                        {cleanLastClickIST}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(tag)}
                          className="h-7 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          {copiedTag === tag ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}