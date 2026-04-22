'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Clock, ChevronLeft, ChevronRight, CalendarCheck,
  Users, Phone, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { format, addDays, startOfWeek, isToday, isSameDay, parseISO } from 'date-fns';

// Days shown: Mon-Sat
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time slots from 9 AM to 9 PM (30-min increments)
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = [];
for (let h = 9; h <= 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 21 && m > 0) break;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    TIME_SLOTS.push({
      hour: h,
      minute: m,
      label: `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`,
    });
  }
}

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
  bookedVia: string;
  fee: number | null;
  whatsappSent: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  confirmed: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-l-amber-500', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  cancelled: { bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-l-rose-400', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-400' },
  completed: { bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-l-teal-500', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
  no_show: { bg: 'bg-slate-50 dark:bg-slate-800/60', border: 'border-l-slate-400', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function WeeklySchedule() {
  const { clinicId } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    return monday;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Generate week dates (Mon-Sat)
  const weekDates = useMemo(() => {
    return DAY_LABELS.map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch appointments for the week
  const fetchAppointments = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const dateFrom = format(weekDates[0], 'yyyy-MM-dd');
      const dateTo = format(weekDates[weekDates.length - 1], 'yyyy-MM-dd');
      const res = await fetch(
        `/api/client/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=100`,
        { headers: { 'x-clinic-id': clinicId } }
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [clinicId, weekDates]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const key = apt.date;
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [appointments]);

  // Get appointments for a specific date/time slot
  const getAppointmentsForSlot = useCallback((date: Date, hour: number, minute: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayApts = appointmentsByDate[dateStr] || [];
    return dayApts.filter((apt) => {
      const [h, m] = apt.time.split(':').map(Number);
      return h === hour && m === minute;
    });
  }, [appointmentsByDate]);

  // Get current time position percentage
  const getCurrentTimePercent = useMemo(() => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const totalMinutes = (h - 9) * 60 + m;
    if (totalMinutes < 0 || totalMinutes > 720) return null;
    return (totalMinutes / 720) * 100;
  }, [currentTime]);

  // Check if a time is past
  const isTimePast = (hour: number, minute: number, dayDate: Date) => {
    const now = new Date();
    if (!isSameDay(now, dayDate)) {
      return dayDate < now && !isSameDay(dayDate, now);
    }
    return hour < now.getHours() || (hour === now.getHours() && minute < now.getMinutes());
  };

  // Get current day index (0=Mon, 5=Sat, or -1 if Sunday)
  const currentDayIndex = useMemo(() => {
    const day = currentTime.getDay(); // 0=Sun
    if (day === 0) return -1; // Sunday not shown
    return day - 1; // 0=Mon
  }, [currentTime]);

  const goToPrevWeek = () => setCurrentWeekStart((d) => addDays(d, -7));
  const goToNextWeek = () => setCurrentWeekStart((d) => addDays(d, 7));
  const goToThisWeek = () => {
    const now = new Date();
    setCurrentWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
  };

  const isCurrentWeek = weekDates.some((d) => isToday(d));

  // Stats
  const totalApts = appointments.length;
  const confirmedApts = appointments.filter((a) => a.status === 'confirmed').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Weekly Schedule</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {format(weekDates[0], 'dd MMM')} — {format(weekDates[weekDates.length - 1], 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Quick stats */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{totalApts} appointments</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                  <Users className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-300">{confirmedApts} confirmed</span>
                </div>

                {/* Nav buttons */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('h-8 text-xs', isCurrentWeek && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium')}
                    onClick={goToThisWeek}
                  >
                    Today
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchAppointments} disabled={loading}>
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    {weekDates.map((date, idx) => {
                      const isTodayCol = isToday(date);
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'px-2 py-3 text-center border-l border-slate-100 dark:border-slate-800/50 transition-colors',
                            isTodayCol && 'bg-emerald-50/60 dark:bg-emerald-900/10'
                          )}
                        >
                          <span className={cn(
                            'text-xs font-semibold uppercase tracking-wider',
                            isTodayCol
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-400'
                          )}>
                            {DAY_LABELS[idx]}
                          </span>
                          <span className={cn(
                            'block text-lg font-bold mt-0.5',
                            isTodayCol ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'
                          )}>
                            {format(date, 'dd')}
                          </span>
                          {isTodayCol && (
                            <Badge className="mt-1 text-[9px] px-1.5 py-0 bg-emerald-500 text-white hover:bg-emerald-500">
                              Today
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Schedule grid */}
                  <div className="relative">
                    {TIME_SLOTS.map(({ hour, minute, label }) => {
                      const isHourMark = minute === 0;
                      return (
                        <div
                          key={`${hour}-${minute}`}
                          className={cn(
                            'grid grid-cols-7',
                            isHourMark ? 'border-b border-slate-100 dark:border-slate-800/50' : 'border-b border-slate-50 dark:border-slate-800/20'
                          )}
                        >
                          {weekDates.map((date, dayIdx) => {
                            const slotApts = getAppointmentsForSlot(date, hour, minute);
                            const isPast = isTimePast(hour, minute, date);
                            const isTodayCol = isToday(date);

                            return (
                              <div
                                key={dayIdx}
                                className={cn(
                                  'schedule-cell border-l border-slate-100 dark:border-slate-800/50 min-h-[40px]',
                                  isPast && 'opacity-50',
                                  isTodayCol && 'bg-emerald-50/20 dark:bg-emerald-900/5',
                                  isHourMark && 'h-[48px]',
                                  !isHourMark && 'h-[40px]'
                                )}
                              >
                                {/* Time label on first column */}
                                {dayIdx === 0 && isHourMark && (
                                  <span className="absolute -left-0 top-0 text-[10px] text-slate-400 dark:text-slate-500 font-mono -ml-[46px] mt-1 whitespace-nowrap">
                                    {label}
                                  </span>
                                )}

                                {/* Appointments in this slot */}
                                {slotApts.length > 0 ? (
                                  <div className="space-y-0.5 p-0.5">
                                    {slotApts.map((apt) => {
                                      const statusStyle = STATUS_STYLES[apt.status] || STATUS_STYLES.pending;
                                      return (
                                        <motion.button
                                          key={apt.id}
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          whileHover={{ scale: 1.02 }}
                                          onClick={() => setSelectedAppointment(apt)}
                                          className={cn(
                                            'schedule-appointment w-full text-left px-1.5 py-1 rounded text-[10px] leading-tight border-l-[3px] transition-all cursor-pointer',
                                            statusStyle.bg,
                                            statusStyle.border,
                                            selectedAppointment?.id === apt.id && 'ring-2 ring-emerald-400 dark:ring-emerald-500'
                                          )}
                                        >
                                          <div className={cn('font-medium truncate', statusStyle.text)}>
                                            {apt.patientName}
                                          </div>
                                          <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                                            {apt.reason || apt.time}
                                          </div>
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Current time indicator */}
                    {currentDayIndex >= 0 && getCurrentTimePercent !== null && weekDates[currentDayIndex] && isToday(weekDates[currentDayIndex]) && (
                      <div
                        className="schedule-now-indicator absolute left-0 right-0 pointer-events-none z-20"
                        style={{ top: `${getCurrentTimePercent}%` }}
                      >
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 shadow-sm shadow-rose-500/50" />
                          <div className="flex-1 h-[2px] bg-rose-500 shadow-sm shadow-rose-500/40" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Empty state */}
                  {totalApts === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <CalendarDays className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No appointments this week</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                        Appointments booked via AI or manually will appear here on the calendar grid.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appointment Detail Panel */}
            <AnimatePresence>
              {selectedAppointment && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Appointment Details</h4>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedAppointment(null)}>
                        Close
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Patient</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{selectedAppointment.patientName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Phone</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">+91 {selectedAppointment.patientPhone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Date & Time</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                          {selectedAppointment.date} at {selectedAppointment.time}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Status</p>
                        <div className="mt-0.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] font-medium capitalize',
                              selectedAppointment.status === 'confirmed' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                              selectedAppointment.status === 'pending' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              selectedAppointment.status === 'cancelled' && 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                              selectedAppointment.status === 'completed' && 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                            )}
                          >
                            {selectedAppointment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {selectedAppointment.reason && (
                      <div className="mt-3">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Reason</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{selectedAppointment.reason}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Booked via {selectedAppointment.bookedVia || 'AI'}
                      </span>
                      {selectedAppointment.whatsappSent && (
                        <Badge variant="secondary" className="text-[9px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                          WhatsApp Sent
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
