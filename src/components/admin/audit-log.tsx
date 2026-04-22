'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Search, Filter, Download, Clock, AlertTriangle, CheckCircle,
  XCircle, Info, ChevronRight, Eye, Globe, User, Server, Phone,
  CreditCard, Bot, Bell, CalendarDays, Lock, Webhook, FileText,
  ArrowUpDown, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/* ============================================================
   Types
   ============================================================ */
interface AuditEntry {
  id: string;
  timestamp: string;
  actionType: string;
  action: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  user: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
}

interface AuditStats {
  total: number;
  today: number;
  errors: number;
  warnings: number;
}

/* ============================================================
   Constants
   ============================================================ */
const ACTION_TYPES = [
  { value: 'all', label: 'All Actions', icon: Shield },
  { value: 'auth', label: 'Authentication', icon: Lock },
  { value: 'clinic', label: 'Clinic Mgmt', icon: Server },
  { value: 'billing', label: 'Billing', icon: CreditCard },
  { value: 'agent', label: 'AI Agent', icon: Bot },
  { value: 'call', label: 'Calls', icon: Phone },
  { value: 'system', label: 'System', icon: Server },
  { value: 'user', label: 'Users', icon: User },
  { value: 'whatsapp', label: 'WhatsApp', icon: Bell },
  { value: 'appointment', label: 'Appointments', icon: CalendarDays },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'integration', label: 'Integrations', icon: Webhook },
];

const SEVERITY_CONFIG = {
  info: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: Info, dot: 'bg-slate-400' },
  success: { color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle, dot: 'bg-emerald-500' },
  warning: { color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: AlertTriangle, dot: 'bg-amber-500' },
  error: { color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: XCircle, dot: 'bg-rose-500' },
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

/* ============================================================
   Component
   ============================================================ */
export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionType, setActionType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        actionType,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEntries(data.entries);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, actionType, debouncedSearch]);

  useEffect(() => { fetchAuditLog(); }, [fetchAuditLog]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAuditLog, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAuditLog]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['Timestamp', 'Type', 'Action', 'Description', 'Severity', 'User', 'Email', 'Role', 'IP'];
    const rows = entries.map(e => [
      format(new Date(e.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      e.actionType,
      e.action,
      `"${e.description}"`,
      e.severity,
      e.user,
      e.userEmail,
      e.userRole,
      e.ipAddress,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceai-audit-log-${format(new Date(), 'ddMMyyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported successfully');
  }, [entries]);

  const formatRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return format(new Date(timestamp), 'dd MMM');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div variants={item} initial="hidden" animate="show" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Audit Log</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track all system activities and user actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn('gap-1.5 text-xs', autoRefresh && 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20')}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', autoRefresh && 'animate-spin')} />
            Auto
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: stats.total, icon: FileText, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
            { label: 'Today', value: stats.today, icon: Clock, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Warnings', value: stats.warnings, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Errors', value: stats.errors, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="border-slate-200/80 dark:border-slate-700/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.bg)}>
                    <stat.icon className={cn('w-4 h-4', stat.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={item} initial="hidden" animate="show" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search actions, descriptions, users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={actionType} onValueChange={(v) => { setActionType(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
            <Filter className="w-4 h-4 mr-1.5 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-2">
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Action Type Quick Filters */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-wrap gap-2">
        {ACTION_TYPES.slice(1).map((t) => (
          <motion.button
            key={t.value}
            variants={item}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setActionType(actionType === t.value ? 'all' : t.value); setPage(1); }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              actionType === t.value
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
            )}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Audit Log Table */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-slate-200/80 dark:border-slate-700/60">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {entries.map((entry, idx) => {
                    const sev = SEVERITY_CONFIG[entry.severity];
                    const SevIcon = sev.icon;
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedEntry(entry)}
                        className={cn(
                          'flex items-start gap-3 p-3 sm:p-4 cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30',
                          idx % 2 === 1 && 'bg-slate-50/30 dark:bg-slate-800/20'
                        )}
                      >
                        {/* Severity indicator */}
                        <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                          <div className={cn('w-2 h-2 rounded-full', sev.dot)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {entry.action}
                            </span>
                            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4', sev.color)}>
                              {entry.actionType}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.user}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {entry.ipAddress}
                            </span>
                          </div>
                        </div>

                        {/* Time + severity icon */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                          <SevIcon className={cn('w-3.5 h-3.5', entry.severity === 'error' ? 'text-rose-500' : entry.severity === 'warning' ? 'text-amber-500' : entry.severity === 'success' ? 'text-emerald-500' : 'text-slate-400')} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={item} initial="hidden" animate="show" className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages} ({stats?.total || 0} entries)
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={cn('w-8 h-8 text-xs p-0', page === pageNum && 'bg-emerald-600 hover:bg-emerald-700')}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}

      {/* Detail Drawer Dialog */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', SEVERITY_CONFIG[selectedEntry.severity].color)}>
                  {(() => {
                    const Icon = SEVERITY_CONFIG[selectedEntry.severity].icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedEntry.action}</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedEntry.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">Severity</p>
                  <Badge variant="outline" className={cn('text-xs', SEVERITY_CONFIG[selectedEntry.severity].color)}>
                    {selectedEntry.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">Type</p>
                  <Badge variant="outline" className="text-xs">{selectedEntry.actionType}</Badge>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">User</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{selectedEntry.user}</p>
                  <p className="text-[10px] text-slate-400">{selectedEntry.userEmail}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">IP Address</p>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{selectedEntry.ipAddress}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">Timestamp</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {format(new Date(selectedEntry.timestamp), 'dd MMM yyyy, HH:mm:ss')} IST
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mb-1">Entry ID</p>
                <p className="text-xs font-mono text-slate-400">{selectedEntry.id}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
