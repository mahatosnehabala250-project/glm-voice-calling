'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, X, Mail, Phone, Shield, MoreVertical,
  UserCheck, UserMinus, AlertTriangle, CheckCircle2, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'away' | 'inactive';
  email: string;
  phone: string;
  permissions: string[];
  initials: string;
  joinDate: string;
}

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Dr. Rajesh Sharma',
    role: 'Owner/Doctor',
    status: 'active',
    email: 'rajesh.sharma@sharma-dental.in',
    phone: '9876543210',
    permissions: ['all'],
    initials: 'RS',
    joinDate: '2023-01-15',
  },
  {
    id: '2',
    name: 'Priya Patel',
    role: 'Receptionist',
    status: 'active',
    email: 'priya.patel@sharma-dental.in',
    phone: '9876543211',
    permissions: ['appointments', 'calls', 'patients'],
    initials: 'PP',
    joinDate: '2023-03-20',
  },
  {
    id: '3',
    name: 'Amit Kumar',
    role: 'Lab Technician',
    status: 'active',
    email: 'amit.kumar@sharma-dental.in',
    phone: '9876543212',
    permissions: ['patients', 'reports'],
    initials: 'AK',
    joinDate: '2023-06-10',
  },
  {
    id: '4',
    name: 'Neha Singh',
    role: 'Accounts',
    status: 'away',
    email: 'neha.singh@sharma-dental.in',
    phone: '9876543213',
    permissions: ['billing', 'reports'],
    initials: 'NS',
    joinDate: '2024-01-05',
  },
];

const ROLE_OPTIONS = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'manager', label: 'Manager' },
];

const PERMISSION_OPTIONS = [
  { value: 'appointments', label: 'Manage Appointments' },
  { value: 'calls', label: 'View Call Logs' },
  { value: 'patients', label: 'Patient Records' },
  { value: 'billing', label: 'Billing & Invoices' },
  { value: 'reports', label: 'Reports & Analytics' },
  { value: 'settings', label: 'Clinic Settings' },
];

const ROLE_COLORS: Record<string, string> = {
  'Owner/Doctor': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  'Receptionist': 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
  'Lab Technician': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  'Accounts': 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border border-violet-200 dark:border-violet-800',
  'Manager': 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
};

const AVATAR_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
};

const getAvatarColor = (id: string) => {
  const idx = parseInt(id, 10) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

export default function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);

  // Add member form state
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'receptionist',
    permissions: ['appointments'] as string[],
  });

  const resetForm = () => {
    setNewMember({ name: '', email: '', phone: '', role: 'receptionist', permissions: ['appointments'] });
  };

  const togglePermission = (perm: string) => {
    setNewMember((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setAdding(true);
    // Simulate API call
    setTimeout(() => {
      const roleLabel = ROLE_OPTIONS.find((r) => r.value === newMember.role)?.label || newMember.role;
      const member: TeamMember = {
        id: Date.now().toString(),
        name: newMember.name.trim(),
        email: newMember.email.trim(),
        phone: newMember.phone.trim(),
        role: roleLabel,
        status: 'active',
        permissions: newMember.permissions,
        initials: getInitials(newMember.name.trim()),
        joinDate: new Date().toISOString().split('T')[0],
      };
      setMembers((prev) => [...prev, member]);
      toast.success(`${member.name} added to the team`);
      resetForm();
      setShowAddDialog(false);
      setAdding(false);
    }, 600);
  };

  const handleRemoveMember = () => {
    if (!removeTarget) return;
    setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
    toast.success(`${removeTarget.name} removed from the team`);
    setRemoveTarget(null);
  };

  const activeCount = members.filter((m) => m.status === 'active').length;
  const awayCount = members.filter((m) => m.status === 'away').length;

  const formatPhone = (phone: string) => {
    if (phone.length === 10) return `+91-${phone.slice(0, 5)}-${phone.slice(5)}`;
    return phone;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Team Members</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <UserCheck className="w-3 h-3 mr-1" />
                      {activeCount} Active
                    </Badge>
                    {awayCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <UserMinus className="w-3 h-3 mr-1" />
                        {awayCount} Away
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Grid */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <AnimatePresence>
          {members.map((member) => (
            <motion.div
              key={member.id}
              variants={itemAnim}
              layout
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            >
              <Card className="border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-4">
                  {/* Top row: avatar + remove */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={cn(
                          'w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center shadow-md',
                          getAvatarColor(member.id)
                        )}>
                          <span className="text-sm font-bold text-white">{member.initials}</span>
                        </div>
                        {/* Status indicator */}
                        <div className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900',
                          member.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'
                        )} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{member.name}</h4>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] mt-1', ROLE_COLORS[member.role] || 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      onClick={() => setRemoveTarget(member)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="font-mono">{formatPhone(member.phone)}</span>
                    </div>
                  </div>

                  {/* Permissions badges */}
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {member.permissions.includes('all') ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                        <Shield className="w-3 h-3 mr-0.5" />
                        Full Access
                      </Badge>
                    ) : (
                      member.permissions.slice(0, 3).map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {perm.charAt(0).toUpperCase() + perm.slice(1)}
                        </Badge>
                      ))
                    )}
                    {member.permissions.length > 3 && !member.permissions.includes('all') && (
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        +{member.permissions.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="mt-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
                      member.status === 'active'
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                    )}>
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        member.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'
                      )} />
                      {member.status === 'active' ? 'Active Now' : 'Away'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Add Team Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              Add Team Member
            </DialogTitle>
            <DialogDescription>Add a new member to your clinic team</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Full Name <span className="text-rose-500">*</span></Label>
              <Input
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="e.g. Vikram Mehta"
                className="border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email <span className="text-rose-500">*</span></Label>
                <Input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="name@clinic.in"
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="9876543210"
                  className="border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v })}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-400" />
                Permissions
              </Label>
              <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                {PERMISSION_OPTIONS.map((perm) => (
                  <label
                    key={perm.value}
                    className="flex items-center gap-3 py-1 cursor-pointer group/perm"
                  >
                    <Checkbox
                      checked={newMember.permissions.includes(perm.value)}
                      onCheckedChange={() => togglePermission(perm.value)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover/perm:text-slate-900 dark:group-hover/perm:text-white transition-colors">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); resetForm(); }}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={adding || !newMember.name.trim() || !newMember.email.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {adding ? (
                <>
                  <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Add Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Remove Team Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{removeTarget?.name}</strong> from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-slate-200 dark:border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
