'use client';

import { useState, useEffect, useRef } from 'react';
import { Wifi, Phone, Calendar, Activity } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string;
  icon: typeof Activity;
  status: 'ok' | 'error' | 'neutral';
}

const POLL_INTERVAL = 30_000;

const DEFAULT_STATS: StatItem[] = [
  { label: 'API Status', value: 'Checking…', icon: Wifi, status: 'neutral' },
  { label: 'SIP Status', value: 'Checking…', icon: Activity, status: 'neutral' },
  { label: 'Active Calls', value: '—', icon: Phone, status: 'neutral' },
  { label: "Today's Bookings", value: '—', icon: Calendar, status: 'neutral' },
];

function StatusDot({ status }: { status: 'ok' | 'error' | 'neutral' }) {
  const color =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'error'
        ? 'bg-rose-500'
        : 'bg-slate-400';
  const ring =
    status === 'ok'
      ? 'ring-emerald-500/30'
      : status === 'error'
        ? 'ring-rose-500/30'
        : 'ring-slate-400/30';

  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {status !== 'neutral' && (
        <span
          className={cn(
            'animate-ping absolute inset-0 rounded-full opacity-50',
            color
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full ring-2',
          color,
          ring
        )}
      />
    </span>
  );
}

function StatCell({ item }: { item: StatItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60 min-w-0">
      <StatusDot status={item.status} />
      <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {item.label}
      </span>
      <span
        className={cn(
          'text-xs font-semibold whitespace-nowrap',
          item.status === 'ok'
            ? 'text-emerald-700 dark:text-emerald-400'
            : item.status === 'error'
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-slate-700 dark:text-slate-300'
        )}
      >
        {item.value}
      </span>
    </div>
  );
}

export default function QuickStatsWidget() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'client';
  const clinicId = user?.clinicId;
  const roleRef = useRef(role);
  const clinicIdRef = useRef(clinicId);

  const [stats, setStats] = useState<StatItem[]>(DEFAULT_STATS);

  useEffect(() => {
    roleRef.current = role;
    clinicIdRef.current = clinicId;
  }, [role, clinicId]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      const next: StatItem[] = DEFAULT_STATS.map((s) => ({ ...s }));
      const currentRole = roleRef.current;
      const currentClinicId = clinicIdRef.current;

      // 1. API (Gemini) health
      try {
        const res = await fetch('/api/gemini?action=health');
        if (!cancelled) {
          next[0] = {
            ...next[0],
            value: res.ok ? 'Operational' : 'Down',
            status: res.ok ? 'ok' : 'error',
          };
        }
      } catch {
        if (!cancelled) {
          next[0] = { ...next[0], value: 'Unknown', status: 'error' };
        }
      }

      // 2. SIP (Vobiz) health
      try {
        const sipRes = await fetch('/api/vobiz?action=health');
        if (!cancelled) {
          next[1] = {
            ...next[1],
            value: sipRes.ok ? 'Connected' : 'Down',
            status: sipRes.ok ? 'ok' : 'error',
          };
        }
      } catch {
        if (!cancelled) {
          next[1] = { ...next[1], value: 'Unknown', status: 'error' };
        }
      }

      // 3. Active Calls count
      try {
        const callsRes = await fetch('/api/vobiz?action=call-history&per_page=1');
        if (!cancelled && callsRes.ok) {
          const data = await callsRes.json();
          const total = data?.pagination?.total ?? data?.total ?? '—';
          next[2] = { ...next[2], value: String(total), status: 'ok' };
        }
      } catch {
        // keep default
      }

      // 4. Today's Bookings
      try {
        if (currentRole === 'client' && currentClinicId) {
          const bookRes = await fetch('/api/client/appointments', {
            headers: { 'x-clinic-id': currentClinicId },
          });
          if (!cancelled && bookRes.ok) {
            const data = await bookRes.json();
            const count = Array.isArray(data) ? data.length : data?.total ?? '—';
            next[3] = { ...next[3], value: String(count), status: 'ok' };
          }
        } else {
          const metricsRes = await fetch('/api/admin/metrics');
          if (!cancelled && metricsRes.ok) {
            const data = await metricsRes.json();
            const bookings = data?.todayBookings ?? data?.bookingsToday ?? '—';
            next[3] = { ...next[3], value: String(bookings), status: 'ok' };
          }
        }
      } catch {
        // keep default
      }

      if (!cancelled) setStats(next);
    }

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900',
        'border-b border-slate-200 dark:border-slate-800',
        'px-4 py-2',
        'overflow-x-auto lg:overflow-visible'
      )}
      role="status"
      aria-label="System quick stats"
    >
      <div className="flex items-center gap-2 lg:gap-3 lg:flex-wrap min-w-max lg:min-w-0">
        {stats.map((item) => (
          <StatCell key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
