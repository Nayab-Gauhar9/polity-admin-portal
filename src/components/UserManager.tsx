import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, BookCheck, MessageSquare, RefreshCw, Activity } from 'lucide-react';
import { coreApiClient } from '@/lib/api';

interface UserData {
  id: number;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  chapters_completed: number;
  last_active: string | null;
  last_event: string;
  last_ip: string | null;
}

interface Stats {
  total_users: number;
  total_notes: number;
  total_ai_queries: number;
}

export function UserManager() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({ total_users: 0, total_notes: 0, total_ai_queries: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await coreApiClient.get('/api/admin/users');
      setUsers(res.data.users || []);
      setStats(res.data.stats || { total_users: 0, total_notes: 0, total_ai_queries: 0 });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Registered Aspirants</p>
              <h3 className="text-2xl font-bold mt-1">{stats.total_users}</h3>
            </div>
            <Users className="h-8 w-8 text-indigo-500 opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total AI Queries</p>
              <h3 className="text-2xl font-bold mt-1">{stats.total_ai_queries}</h3>
            </div>
            <MessageSquare className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Study Notes Created</p>
              <h3 className="text-2xl font-bold mt-1">{stats.total_notes}</h3>
            </div>
            <BookCheck className="h-8 w-8 text-amber-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Users Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Student Activity & Session Telemetry
              </CardTitle>
              <CardDescription>
                Live monitoring of registered candidates, chapter progress, and session events.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 rounded-md text-sm bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Email</TableHead>
                  <TableHead>Completed Chapters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Client IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      {loading ? 'Fetching students...' : 'No users registered yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {u.display_name || 'Anonymous Aspirant'}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {u.chapters_completed} / 80 Chapters
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={u.last_event === 'LOGIN' ? 'default' : 'outline'}
                          className={u.last_event === 'LOGIN' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        >
                          {u.last_event}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {u.last_active ? new Date(u.last_active).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {u.last_ip || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
