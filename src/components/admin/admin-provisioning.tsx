'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Phone, CheckCircle, XCircle, RefreshCw, Link2, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SIPNumber {
  id: string;
  number: string;
  status: 'available' | 'assigned' | 'offline';
  assignedClinic?: string;
  assignedClinicId?: string;
}

interface ClinicBasic {
  id: string;
  name: string;
  doctorName: string;
  city: string;
  status: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// Simulated SIP numbers (since we don't have a dedicated API for SIP)
const MOCK_SIP_NUMBERS: SIPNumber[] = [
  { id: 'sip1', number: '080-4567-1001', status: 'available' },
  { id: 'sip2', number: '080-4567-1002', status: 'available' },
  { id: 'sip3', number: '080-4567-1003', status: 'assigned', assignedClinic: 'Sharma Dental Clinic', assignedClinicId: 'clinic1' },
  { id: 'sip4', number: '022-4567-1004', status: 'assigned', assignedClinic: 'Patel Eye Hospital', assignedClinicId: 'clinic2' },
  { id: 'sip5', number: '011-4567-1005', status: 'available' },
  { id: 'sip6', number: '040-4567-1006', status: 'offline' },
  { id: 'sip7', number: '080-4567-1007', status: 'available' },
  { id: 'sip8', number: '022-4567-1008', status: 'assigned', assignedClinic: 'Gupta Skin Clinic', assignedClinicId: 'clinic3' },
  { id: 'sip9', number: '033-4567-1009', status: 'available' },
  { id: 'sip10', number: '020-4567-1010', status: 'offline' },
];

export default function AdminProvisioning() {
  const [sipNumbers, setSipNumbers] = useState<SIPNumber[]>(MOCK_SIP_NUMBERS);
  const [clinics, setClinics] = useState<ClinicBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await fetch('/api/admin/clinics');
        if (res.ok) {
          const data = await res.json();
          setClinics((data.clinics || []).map((c: { id: string; name: string; doctorName: string; city: string; status: string; sipNumber?: string | null }) => ({
            id: c.id,
            name: c.name,
            doctorName: c.doctorName,
            city: c.city,
            status: c.status,
          })));
          // Set existing assignments from SIP data
          const existingAssignments: Record<string, string> = {};
          MOCK_SIP_NUMBERS.forEach(sip => {
            if (sip.assignedClinicId) existingAssignments[sip.id] = sip.assignedClinicId;
          });
          setAssignments(existingAssignments);
        }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchClinics();
  }, []);

  const handleAssign = async (sipId: string, clinicId: string) => {
    if (!clinicId) return;
    setActionLoading(sipId);
    try {
      await new Promise(r => setTimeout(r, 800)); // simulate delay
      setSipNumbers(prev => prev.map(s =>
        s.id === sipId ? { ...s, status: 'assigned' as const, assignedClinic: clinics.find(c => c.id === clinicId)?.name, assignedClinicId: clinicId } : s
      ));
      setAssignments(prev => ({ ...prev, [sipId]: clinicId }));
      toast.success('SIP number assigned successfully');
    } catch {
      toast.error('Failed to assign SIP number');
    }
    finally { setActionLoading(null); }
  };

  const handleUnassign = async (sipId: string) => {
    setActionLoading(sipId);
    try {
      await new Promise(r => setTimeout(r, 800));
      setSipNumbers(prev => prev.map(s =>
        s.id === sipId ? { ...s, status: 'available' as const, assignedClinic: undefined, assignedClinicId: undefined } : s
      ));
      setAssignments(prev => { const n = { ...prev }; delete n[sipId]; return n; });
      toast.success('SIP number unassigned');
    } catch {
      toast.error('Failed to unassign SIP number');
    }
    finally { setActionLoading(null); }
  };

  const stats = {
    total: sipNumbers.length,
    available: sipNumbers.filter(s => s.status === 'available').length,
    assigned: sipNumbers.filter(s => s.status === 'assigned').length,
    offline: sipNumbers.filter(s => s.status === 'offline').length,
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Numbers', value: stats.total, icon: Phone, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Available', value: stats.available, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Assigned', value: stats.assigned, icon: Link2, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/30' },
          { label: 'Offline', value: stats.offline, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} variants={itemAnim}>
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                    <Icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* SIP Numbers List */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              Vobiz SIP Numbers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                ))
              ) : sipNumbers.map((sip) => (
                <div
                  key={sip.id}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-colors',
                    sip.status === 'available' && 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/50',
                    sip.status === 'assigned' && 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-200/50 dark:border-teal-800/50',
                    sip.status === 'offline' && 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200/50 dark:border-rose-800/50',
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full flex-shrink-0',
                      sip.status === 'available' && 'bg-emerald-500',
                      sip.status === 'assigned' && 'bg-teal-500',
                      sip.status === 'offline' && 'bg-rose-500',
                    )} />
                    <div className="min-w-0">
                      <p className="font-mono font-medium text-slate-900 dark:text-white">{sip.number}</p>
                      {sip.assignedClinic && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sip.assignedClinic}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    <Badge variant="outline" className={cn(
                      'text-xs font-medium capitalize',
                      sip.status === 'available' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                      sip.status === 'assigned' && 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
                      sip.status === 'offline' && 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
                    )}>
                      {sip.status}
                    </Badge>

                    {sip.status === 'available' && (
                      <Select
                        value={assignments[sip.id] || ''}
                        onValueChange={(v) => handleAssign(sip.id, v)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Assign to clinic" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinics.filter(c => c.status === 'active' || c.status === 'trial').map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id} className="text-xs">
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {sip.status === 'assigned' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        onClick={() => handleUnassign(sip.id)}
                        disabled={actionLoading === sip.id}
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        Unassign
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
