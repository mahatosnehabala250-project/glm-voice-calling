'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from 'date-fns';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
  whatsappSent: boolean;
  consultationFee: string | null;
  bookedVia: string;
}

interface AppointmentCalendarProps {
  onOpenPatientDrawer?: (name: string, phone: string) => void;
}

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  confirmed: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50', label: 'Confirmed' },
  pending: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50', label: 'Pending' },
  cancelled: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50', label: 'Cancelled' },
  completed: { dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50', label: 'Completed' },
  no_show: { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50', label: 'No Show' },
};

const QUICK_FILTERS = ['all', 'confirmed', 'pending', 'cancelled'] as const;

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function AppointmentCalendar({ onOpenPatientDrawer }: AppointmentCalendarProps) {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchAppointments = useCallback(async () => {
    if (!user?.clinicId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/client/appointments', {
        headers: { 'x-clinic-id': user.clinicId },
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user?.clinicId]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthAppts = useMemo(() => {
    const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
    return filtered.filter(a => a.date.startsWith(monthKey));
  }, [appointments, monthKey, filter]);

  const stats = useMemo(() => {
    const all = appointments.filter(a => a.date.startsWith(monthKey));
    return {
      total: all.length,
      confirmed: all.filter(a => a.status === 'confirmed').length,
      pending: all.filter(a => a.status === 'pending').length,
      cancelled: all.filter(a => a.status === 'cancelled').length,
    };
  }, [appointments, monthKey]);

  const calStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getApptsForDay = useCallback((day: Date) => {
    const ds = format(day, 'yyyy-MM-dd');
    return monthAppts.filter(a => a.date === ds);
  }, [monthAppts]);

  const selectedDayAppts = useMemo(() => {
    if (!selectedDay) return [];
    return monthAppts.filter(a => a.date === format(selectedDay, 'yyyy-MM-dd'));
  }, [selectedDay, monthAppts]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setCurrentMonth(p => subMonths(p, 1));
    if (e.key === 'ArrowRight') setCurrentMonth(p => addMonths(p, 1));
  }, []);

  return (
    <div className="space-y-4">
      {/* Mini Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Total', value: stats.total, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
            { label: 'Confirmed', value: stats.confirmed, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
            { label: 'Pending', value: stats.pending, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
            { label: 'Cancelled', value: stats.cancelled, cls: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
          ].map(s => (
            <div key={s.label} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold', s.cls)}>
              <span>{s.label}</span>
              <span className="font-bold">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {QUICK_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                filter === f ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-4" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Calendar Grid */}
        <Card className="flex-1 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(p => subMonths(p, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}>
                      Today
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(p => addMonths(p, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Week Headers */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2">{d}</div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                  {days.map(day => {
                    const da = getApptsForDay(day);
                    const inMonth = isSameMonth(day, currentMonth);
                    const todayDate = isToday(day);
                    const selected = selectedDay && isSameDay(day, selectedDay);
                    return (
                      <motion.button key={day.toISOString()} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          'min-h-[72px] sm:min-h-[80px] p-1.5 text-left transition-colors outline-none',
                          inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/30',
                          todayDate && !selected && 'ring-2 ring-emerald-400 ring-inset',
                          selected && 'bg-emerald-100 dark:bg-emerald-900/30',
                        )}>
                        <span className={cn(
                          'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                          !inMonth && 'text-slate-300 dark:text-slate-600',
                          todayDate && 'bg-emerald-500 text-white font-bold',
                          !todayDate && inMonth && 'text-slate-700 dark:text-slate-300',
                        )}>{format(day, 'd')}</span>
                        {da.length > 0 && inMonth && (
                          <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                            {da.slice(0, 3).map(a => (
                              <span key={a.id} className={cn('w-2 h-2 rounded-full', STATUS_STYLES[a.status]?.dot || 'bg-slate-400')} />
                            ))}
                            {da.length > 3 && (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-0.5">+{da.length - 3}</span>
                            )}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 px-1">
                  {Object.entries(STATUS_STYLES).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', v.dot)} />
                      <span className="text-[10px] text-slate-500 capitalize">{v.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <div className="lg:w-[380px] flex-shrink-0">
          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div key={format(selectedDay, 'yyyy-MM-dd')}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}>
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        {format(selectedDay, 'EEE, MMM d')}
                      </h4>
                      {isToday(selectedDay) && (
                        <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">Today</Badge>
                      )}
                    </div>
                    {selectedDayAppts.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-slate-400">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-xs">No appointments scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {selectedDayAppts.map(appt => {
                          const st = STATUS_STYLES[appt.status] || STATUS_STYLES.pending;
                          return (
                            <motion.div key={appt.id}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              onClick={() => onOpenPatientDrawer?.(appt.patientName, appt.patientPhone)}
                              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    {appt.patientName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />{formatTime(appt.time)}
                                    </span>
                                    {appt.reason && (
                                      <span className="text-xs text-slate-400 truncate">{appt.reason}</span>
                                    )}
                                  </div>
                                  {appt.consultationFee && (
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                      ₹{appt.consultationFee}
                                    </p>
                                  )}
                                </div>
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize flex-shrink-0', st.badge)}>
                                  {st.label}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-3 text-center">{selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4 flex flex-col items-center justify-center py-16 text-slate-400">
                    <Calendar className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">Select a day</p>
                    <p className="text-xs mt-1">Click on a date to view appointments</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
