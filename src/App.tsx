import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  Users, 
  FileText, 
  BookOpen, 
  AlertTriangle, 
  Layers, 
  Newspaper, 
  Database,
  Menu,
  X
} from 'lucide-react';
import { CacheManager } from '@/components/CacheManager';
import { UserManager } from '@/components/UserManager';
import { DossierManager } from '@/components/DossierManager';
import { ReportManager } from '@/components/ReportManager';
import { ArticleManager } from '@/components/ArticleManager';
import { PYQManager } from '@/components/PYQManager';
import { PressManager } from '@/components/PressManager';

const queryClient = new QueryClient();

type TabType = 'reports' | 'users' | 'pyqs' | 'articles' | 'dossiers' | 'press' | 'cache';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'reports' as const, label: 'Audit & Reports', icon: AlertTriangle },
    { id: 'users' as const, label: 'Students & Telemetry', icon: Users },
    { id: 'pyqs' as const, label: 'Prelims PYQ Bank', icon: Layers },
    { id: 'articles' as const, label: 'Articles & Bare Act', icon: BookOpen },
    { id: 'dossiers' as const, label: 'Living Dossiers', icon: FileText },
    { id: 'press' as const, label: 'Press Ingestion ETL', icon: Newspaper },
    { id: 'cache' as const, label: 'Cache & Systems', icon: Database },
  ];

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              PM
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 leading-tight">Polity Mentor</h2>
              <p className="text-[10px] text-slate-400 capitalize">{activeTab.replace('-', ' ')}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          />
        )}

        {/* Navigation Sidebar (Desktop persistent, Mobile slide-over) */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shrink-0
          lg:static lg:w-64 lg:translate-x-0 lg:bg-slate-900/60 lg:backdrop-blur-sm
          ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
                PM
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-100">Polity Mentor</h2>
                <p className="text-xs text-slate-400">Back Office Cockpit</p>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950 min-w-0">
          <header className="hidden lg:flex h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm px-8 items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Admin</span>
              <span>/</span>
              <span className="capitalize font-semibold text-slate-200">{activeTab}</span>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {activeTab === 'reports' && <ReportManager />}
            {activeTab === 'users' && <UserManager />}
            {activeTab === 'pyqs' && <PYQManager />}
            {activeTab === 'articles' && <ArticleManager />}
            {activeTab === 'dossiers' && <DossierManager />}
            {activeTab === 'press' && <PressManager />}
            {activeTab === 'cache' && <CacheManager />}
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}