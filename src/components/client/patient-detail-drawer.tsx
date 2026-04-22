'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import {
  User, Phone, Mail, CalendarCheck, PhoneCall,
  CalendarPlus, PhoneIncoming, Clock, XCircle, CheckCircle
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PatientHistoryAppointment {
  id: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
  bookedVia: string;
}

interface PatientHistoryCall {
  id: string;
  startedAt: string;
  duration: number;
  status: string;
  intent: string | null;
}

interface PatientDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  patientPhone: string;
}

const APPT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  confirmed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  no_show: 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

const CALL_STATUS_COLORS: Record<string, string> = {
  answered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  missed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  transferred: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  ringing: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  failed: 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

function formatPhoneDisplay(phone: string) {
  if (phone.length === 10) return `+91-${phone.slice(0, 5)}-${phone.slice(5)}`;
  return phone;
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
  } catch {
    return dateStr;
  }
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatCallDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    return `${day}/${month}/${year}, ${hour}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds: number) {
  if (seconds === 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PatientDetailDrawer({ open, onOpenChange, patientName, patientPhone }: PatientDetailDrawerProps) {
  const { user } = useAuthStore();
  const { setClientPage } = useAppStore();
  const [appointments, setAppointments] = useState<PatientHistoryAppointment[]>([]);
  const [calls, setCalls] = useState<PatientHistoryCall[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user?.clinicId || !patientPhone) return;
    setLoading(true);
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/client/patient-history?phone=${encodeURIComponent(patientPhone)}`, {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) {
          const data = await res.json();
          setAppointments(data.appointments || []);
          setCalls(data.calls || []);
        }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [open, user?.clinicId, patientPhone]);

  const initials = patientName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold flex-shrink-0 ring-2 ring-white/30">
                {initials}
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-lg font-bold text-white truncate">{patientName}</SheetTitle>
                <SheetDescription className="flex items-center gap-1.5 mt-1 text-emerald-100">
                  <Phone className="w-3.5 h-3.5" />
                  {formatPhoneDisplay(patientPhone)}
                </SheetDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-emerald-500" />
                Contact Info
              </h3>
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300">{formatPhoneDisplay(patientPhone)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Mail className="w-4 h-4" />
                  <span>No email on record</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Appointment History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                Appointment History
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">No appointments found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{appt.reason || 'General consultation'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(appt.date)} at {formatTime(appt.time)}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-medium capitalize flex-shrink-0', APPT_STATUS_COLORS[appt.status] || APPT_STATUS_COLORS.pending)}>
                        {appt.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Call History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <PhoneCall className="w-4 h-4 text-emerald-500" />
                Call History
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : calls.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <PhoneCall className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">No call records found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {calls.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        call.status === 'answered' || call.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : call.status === 'missed'
                          ? 'bg-rose-100 dark:bg-rose-900/30'
                          : 'bg-amber-100 dark:bg-amber-900/30'
                      )}>
                        {call.status === 'missed' ? (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        ) : (
                          <PhoneCall className={cn(
                            'w-4 h-4',
                            call.status === 'answered' || call.status === 'completed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          )} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {call.intent ? call.intent.charAt(0).toUpperCase() + call.intent.slice(1) : 'General'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatCallDate(call.startedAt)}
                          {call.duration > 0 && (
                            <span className="ml-2">{formatDuration(call.duration)}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-medium capitalize flex-shrink-0', CALL_STATUS_COLORS[call.status] || CALL_STATUS_COLORS.answered)}>
                        {call.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                Quick Actions
              </h3>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    onOpenChange(false);
                    setClientPage('appointments');
                  }}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  New Appointment
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  onClick={() => {
                    onOpenChange(false);
                    setClientPage('calls');
                  }}
                >
                  <PhoneIncoming className="w-4 h-4 mr-2" />
                  Call Back
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
