'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ============================================================
   Stat Card Skeleton (4 in a row)
   ============================================================ */
export function StatCardSkeletons({ count = 4 }: { count?: number }) {
  return <StatCardSkeleton count={count} />;
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   Table Skeleton with alternating rows
   ============================================================ */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          {Array.from({ length: Math.min(cols, 4) }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className={cn(
                'flex items-center gap-4 px-5 py-3',
                rowIdx % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-800/20'
              )}
            >
              {Array.from({ length: cols }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className="h-4 flex-1"
                  style={{ maxWidth: colIdx === 0 ? '30%' : '20%' }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Chart Skeleton (rectangular placeholder)
   ============================================================ */
export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg bg-slate-100/60 dark:bg-slate-800/40" style={{ height }}>
          {/* Simulated chart grid lines */}
          <div className="absolute inset-4 flex flex-col justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-px w-full" />
            ))}
          </div>
          {/* Simulated bars */}
          <div className="absolute inset-4 flex items-end justify-around gap-2 px-2 pb-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-t"
                style={{ height: `${35 + Math.random() * 55}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Card Skeleton with title and content
   ============================================================ */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-3"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Full Page Skeleton (stat cards + charts + table)
   ============================================================ */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <StatCardSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}

/* ============================================================
   Metrics Row Skeleton (6 cards in 2x3 grid)
   ============================================================ */
export function MetricsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-7 w-16 mb-1" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   Date Range Filter Skeleton
   ============================================================ */
export function DateRangeSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Mini stat bar skeleton
   ============================================================ */
export function MiniStatSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-12 mb-1" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Leaderboard skeleton
   ============================================================ */
export function LeaderboardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   Welcome Banner Skeleton
   ============================================================ */
export function WelcomeBannerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl p-6 lg:p-10', className)}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 animate-pulse" />
      <div className="absolute bottom-0 right-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl bg-white/20" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64 bg-white/20" />
            <Skeleton className="h-4 w-48 bg-white/15" />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg bg-white/15" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-10 bg-white/20" />
                <Skeleton className="h-3 w-16 bg-white/15" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Table Body Skeleton (for use INSIDE <tbody>)
   Uses <tr>/<td> instead of <Card>/<div> to avoid hydration errors.
   ============================================================ */
export function TableBodySkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr
          key={rowIdx}
          className={cn(
            'animate-pulse',
            rowIdx % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-800/20'
          )}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="py-3 px-4">
              <Skeleton
                className="h-4 w-full"
                style={{ maxWidth: colIdx === 0 ? '80%' : '60%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ============================================================
   Schedule grid skeleton
   ============================================================ */
export function ScheduleSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
